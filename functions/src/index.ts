import {lookup} from "node:dns/promises";
import {isIP} from "node:net";
import * as logger from "firebase-functions/logger";
import {setGlobalOptions} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";

setGlobalOptions({maxInstances: 10, region: "us-central1"});

const REQUEST_TIMEOUT_SECONDS = 30;
const MAX_HTML_CHARS = 1_000_000;

class RequestError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

type ScrapedMetadata = {
  canonicalUrl?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  faviconUrl?: string;
  siteName?: string;
};

function normalizePuzzleUrl(rawUrl: string) {
  const parsed = new URL(rawUrl.trim());
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();

  if (
    (parsed.protocol === "https:" && parsed.port === "443") ||
    (parsed.protocol === "http:" && parsed.port === "80")
  ) {
    parsed.port = "";
  }

  const sortedParams = [...parsed.searchParams.entries()]
    .filter(([key]) => !key.toLowerCase().startsWith("utm_"))
    .sort(([a], [b]) => a.localeCompare(b));

  parsed.search = "";
  for (const [key, value] of sortedParams) {
    parsed.searchParams.append(key, value);
  }

  if (parsed.pathname !== "/") {
    parsed.pathname = parsed.pathname.replace(/\/+$/g, "");
  }

  return parsed.toString();
}

function getRequestUrl(req: {query: unknown; body: unknown}) {
  const queryRecord = req.query as Record<string, unknown>;
  if (typeof queryRecord.url === "string" && queryRecord.url.trim()) {
    return queryRecord.url.trim();
  }

  const bodyRecord = req.body as Record<string, unknown>;
  if (typeof bodyRecord?.url === "string" && bodyRecord.url.trim()) {
    return bodyRecord.url.trim();
  }

  return "";
}

function isPrivateIpv4(address: string) {
  const [a, b] = address.split(".").map((value) => Number(value));
  if ([a, b].some((value) => Number.isNaN(value))) {
    return false;
  }

  if (a === 10) {
    return true;
  }

  if (a === 127) {
    return true;
  }

  if (a === 169 && b === 254) {
    return true;
  }

  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }

  if (a === 192 && b === 168) {
    return true;
  }

  return false;
}

function isPrivateIpv6(address: string) {
  const lower = address.toLowerCase();
  return (
    lower === "::1" ||
    lower.startsWith("fe80:") ||
    lower.startsWith("fc") ||
    lower.startsWith("fd")
  );
}

function isBlockedAddress(address: string) {
  const family = isIP(address);
  if (family === 4) {
    return isPrivateIpv4(address);
  }

  if (family === 6) {
    return isPrivateIpv6(address);
  }

  return false;
}

async function assertSafeTarget(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new RequestError(400, "Only http/https URLs are allowed.");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw new RequestError(400, "Private hostnames are not allowed.");
  }

  if (isBlockedAddress(hostname)) {
    throw new RequestError(400, "Private IP addresses are not allowed.");
  }

  let addresses: Array<{address: string}> = [];
  try {
    addresses = await lookup(hostname, {all: true, verbatim: true});
  } catch {
    throw new RequestError(400, "Could not resolve hostname.");
  }

  if (addresses.length === 0) {
    throw new RequestError(400, "Could not resolve hostname.");
  }

  if (addresses.some((entry) => isBlockedAddress(entry.address))) {
    throw new RequestError(400, "Host resolves to a private network address.");
  }
}

function getTitleFromHtml(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch?.[1]?.trim() || undefined;
}

function parseAttributes(tag: string) {
  const attributes: Record<string, string> = {};
  const attrPattern =
    /([a-zA-Z0-9:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

  let match = attrPattern.exec(tag);
  while (match) {
    const key = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attributes[key] = value.trim();
    match = attrPattern.exec(tag);
  }

  return attributes;
}

function resolveAgainstBase(rawValue: string | undefined, baseUrl: string) {
  if (!rawValue) {
    return undefined;
  }

  try {
    return new URL(rawValue, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function firstMetaValue(metaMap: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    if (metaMap[key]) {
      return metaMap[key];
    }
  }

  return undefined;
}

function extractMetadataFromHtml(html: string, baseUrl: string): ScrapedMetadata {
  const metaMap: Record<string, string> = {};
  const metaTags = html.match(/<meta\s+[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const attributes = parseAttributes(tag);
    const key = (attributes.property || attributes.name || "").toLowerCase();
    const content = attributes.content?.trim();

    if (key && content) {
      metaMap[key] = content;
    }
  }

  let faviconUrl: string | undefined;
  const linkTags = html.match(/<link\s+[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    const attributes = parseAttributes(tag);
    const rel = (attributes.rel || "").toLowerCase();
    if (!rel) {
      continue;
    }

    if (!faviconUrl && rel.includes("icon")) {
      faviconUrl = resolveAgainstBase(attributes.href, baseUrl);
    }

    if (rel.includes("canonical") && !metaMap["link:canonical"]) {
      const canonical = resolveAgainstBase(attributes.href, baseUrl);
      if (canonical) {
        metaMap["link:canonical"] = canonical;
      }
    }
  }

  const title = firstMetaValue(metaMap, [
    "og:title",
    "twitter:title",
    "title",
  ]) || getTitleFromHtml(html);

  const description = firstMetaValue(metaMap, [
    "og:description",
    "twitter:description",
    "description",
  ]);

  const imageUrl = resolveAgainstBase(
    firstMetaValue(metaMap, [
      "og:image",
      "twitter:image",
      "twitter:image:src",
    ]),
    baseUrl
  );

  const canonicalUrl = resolveAgainstBase(
    firstMetaValue(metaMap, ["og:url", "link:canonical"]),
    baseUrl
  );

  return {
    canonicalUrl,
    title,
    description,
    imageUrl,
    faviconUrl,
    siteName: firstMetaValue(metaMap, ["og:site_name"]),
  };
}

export const resolvePuzzleMetadata = onRequest(
  {
    cors: true,
    timeoutSeconds: REQUEST_TIMEOUT_SECONDS,
    memory: "256MiB",
  },
  async (req, res) => {
    if (req.method !== "GET" && req.method !== "POST") {
      res.status(405).json({error: "Use GET or POST for this endpoint."});
      return;
    }

    try {
      const requestedUrl = getRequestUrl(req);
      if (!requestedUrl) {
        throw new RequestError(400, "Missing URL. Pass `url` in query or body.");
      }

      if (requestedUrl.length > 2048) {
        throw new RequestError(400, "URL is too long.");
      }

      const normalizedInput = normalizePuzzleUrl(requestedUrl);
      const parsed = new URL(normalizedInput);
      await assertSafeTarget(parsed);

      const response = await fetch(normalizedInput, {
        method: "GET",
        redirect: "follow",
        headers: {
          "accept":
            "text/html,application/xhtml+xml," +
            "application/xml;q=0.9,*/*;q=0.8",
          "user-agent":
            "DailyPuzzleFeedBot/1.0 (+https://daily-puzzle-feed.firebaseapp.com)",
        },
      });

      if (!response.ok) {
        throw new RequestError(502, "Could not fetch target URL.");
      }

      const finalUrl = normalizePuzzleUrl(response.url || normalizedInput);
      const html = (await response.text()).slice(0, MAX_HTML_CHARS);
      const metadata = extractMetadataFromHtml(html, finalUrl);
      const canonicalUrl = normalizePuzzleUrl(
        metadata.canonicalUrl || finalUrl
      );

      const payload = {
        url: normalizedInput,
        finalUrl,
        canonicalUrl,
        title: metadata.title || parsed.hostname,
        description: metadata.description || "",
        imageUrl: metadata.imageUrl || null,
        faviconUrl: metadata.faviconUrl || null,
        siteName: metadata.siteName || parsed.hostname,
        tags: [] as string[],
      };

      logger.info("resolvePuzzleMetadata success", {
        url: normalizedInput,
        finalUrl,
        canonicalUrl,
      });
      res.status(200).json(payload);
    } catch (error) {
      if (error instanceof RequestError) {
        logger.warn("resolvePuzzleMetadata validation failed", {
          message: error.message,
        });
        res.status(error.statusCode).json({error: error.message});
        return;
      }

      logger.error("resolvePuzzleMetadata unexpected failure", error);
      res.status(500).json({error: "Metadata resolution failed."});
    }
  }
);
