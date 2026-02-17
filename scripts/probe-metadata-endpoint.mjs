import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_URLS = [
	"https://www.nytimes.com/games/wordle/index.html",
	"https://wafflegame.net/daily",
	"https://travle.earth",
	"https://www.fogglegame.com",
	"https://www.nordle.us",
];

function readDotEnv(dotEnvPath = ".env") {
	try {
		const absolutePath = resolve(process.cwd(), dotEnvPath);
		const contents = readFileSync(absolutePath, "utf8");
		const env = {};

		for (const line of contents.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) {
				continue;
			}

			const separatorIndex = trimmed.indexOf("=");
			if (separatorIndex === -1) {
				continue;
			}

			const key = trimmed.slice(0, separatorIndex).trim();
			const value = trimmed.slice(separatorIndex + 1).trim();
			if (!key) {
				continue;
			}

			env[key] = value;
		}

		return env;
	} catch {
		return {};
	}
}

function printUsageAndExit() {
	console.log(
		[
			"Usage: npm run test:metadata -- [--json] [url ...]",
			"",
			"Options:",
			"  --json   print full JSON payload per URL",
			"",
			"Examples:",
			"  npm run test:metadata",
			"  npm run test:metadata -- https://framed.wtf https://globle-game.com/game",
			"  npm run test:metadata -- --json https://wafflegame.net/daily"
		].join("\n")
	);
	process.exit(0);
}

async function probeUrl(endpoint, url, jsonMode) {
	const target = `${endpoint}?url=${encodeURIComponent(url)}`;
	const response = await fetch(target, {
		method: "GET",
		headers: {
			accept: "application/json"
		}
	});

	let payload = null;
	try {
		payload = await response.json();
	} catch {
		payload = null;
	}

	if (jsonMode) {
		console.log(`\n=== ${url} (${response.status}) ===`);
		console.log(JSON.stringify(payload, null, 2));
		return;
	}

	if (!response.ok) {
		console.log(`\n[${response.status}] ${url}`);
		console.log(`  error: ${payload?.error ?? "unknown error"}`);
		return;
	}

	console.log(`\n[${response.status}] ${url}`);
	console.log(`  title: ${payload?.title ?? ""}`);
	console.log(`  canonicalUrl: ${payload?.canonicalUrl ?? ""}`);
	console.log(`  imageUrl: ${payload?.imageUrl ?? ""}`);
	console.log(`  faviconUrl: ${payload?.faviconUrl ?? ""}`);
}

async function main() {
	const args = process.argv.slice(2);
	if (args.includes("--help") || args.includes("-h")) {
		printUsageAndExit();
	}

	const jsonMode = args.includes("--json");
	const urls = args.filter((arg) => !arg.startsWith("--"));

	const dotEnv = readDotEnv();
	const endpoint =
		process.env.PUBLIC_PUZZLE_METADATA_ENDPOINT ?? dotEnv.PUBLIC_PUZZLE_METADATA_ENDPOINT;

	if (!endpoint) {
		console.error(
			"Missing PUBLIC_PUZZLE_METADATA_ENDPOINT. Add it to .env or export it in your shell."
		);
		process.exit(1);
	}

	const finalUrls = urls.length > 0 ? urls : DEFAULT_URLS;
	console.log(`Using endpoint: ${endpoint}`);
	console.log(`Probing ${finalUrls.length} URL(s)...`);

	for (const url of finalUrls) {
		try {
			await probeUrl(endpoint, url, jsonMode);
		} catch (error) {
			const message = error instanceof Error ? error.message : "unknown error";
			console.log(`\n[error] ${url}`);
			console.log(`  ${message}`);
		}
	}
}

main();
