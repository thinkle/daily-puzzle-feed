import {
	createPuzzleIdFromUrl,
	normalizePuzzleUrl,
	normalizeTags,
	type PuzzleImageMode,
	type PuzzleDefinition,
	type PuzzleDraftInput
} from '$lib/model/puzzle';
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from '$lib/firebase/client';
import { collection, getDocs, limit, query, where, type DocumentData } from 'firebase/firestore';

type ResolveArgs = {
	url: string;
	catalog: PuzzleDefinition[];
};

type MetadataRecord = Record<string, unknown>;

type ResolvedMetadata = {
	canonicalUrl?: string;
	title?: string;
	description?: string;
	imageUrl?: string;
	faviconUrl?: string;
	siteName?: string;
	tags?: string[];
	archiveUrl?: string;
	archiveUrlTemplate?: string;
	unlimitedUrl?: string;
	unlimitedUrlTemplate?: string;
};

export type PuzzleUrlResolution =
	| {
			kind: 'existing';
			source: 'local' | 'firestore';
			puzzle: PuzzleDefinition;
	  }
	| {
			kind: 'prefill';
			source: 'metadata_endpoint' | 'fallback';
			prefill: PuzzleDraftInput;
			metadata: ResolvedMetadata | null;
	  };

function asString(value: unknown) {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asStringArray(value: unknown) {
	if (Array.isArray(value)) {
		return value.filter(
			(item): item is string => typeof item === 'string' && item.trim().length > 0
		);
	}

	if (typeof value === 'string') {
		return normalizeTags(value);
	}

	return undefined;
}

function asRecord(value: unknown): MetadataRecord | undefined {
	return typeof value === 'object' && value !== null ? (value as MetadataRecord) : undefined;
}

function parseMetadataPayload(payload: unknown): ResolvedMetadata | null {
	const unwrapped = asRecord(payload)?.data ?? payload;
	const metadata = asRecord(unwrapped);
	if (!metadata) {
		return null;
	}

	const archive = asRecord(metadata.archive);
	const unlimited = asRecord(metadata.unlimited);

	return {
		canonicalUrl:
			asString(metadata.canonicalUrl) ?? asString(metadata.url) ?? asString(metadata.finalUrl),
		title: asString(metadata.title) ?? asString(metadata.ogTitle),
		description: asString(metadata.description) ?? asString(metadata.ogDescription),
		imageUrl:
			asString(metadata.imageUrl) ??
			asString(metadata.image) ??
			asString(metadata.ogImage) ??
			asString(asRecord(metadata.social)?.imageUrl),
		faviconUrl:
			asString(metadata.faviconUrl) ??
			asString(metadata.iconUrl) ??
			asString(asRecord(metadata.social)?.faviconUrl),
		siteName: asString(metadata.siteName) ?? asString(metadata.domain),
		tags: asStringArray(metadata.tags),
		archiveUrl: asString(archive?.url) ?? asString(metadata.archiveUrl),
		archiveUrlTemplate: asString(archive?.urlTemplate) ?? asString(metadata.archiveUrlTemplate),
		unlimitedUrl: asString(unlimited?.url) ?? asString(metadata.unlimitedUrl),
		unlimitedUrlTemplate:
			asString(unlimited?.urlTemplate) ?? asString(metadata.unlimitedUrlTemplate)
	};
}

function inferTitleFromUrl(url: string) {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.replace(/^www\./i, '');
		return host
			.split('.')[0]
			.replace(/[-_]+/g, ' ')
			.replace(/\b\w/g, (match) => match.toUpperCase());
	} catch {
		return 'Custom Puzzle';
	}
}

function mapFirestorePuzzle(docId: string, data: DocumentData): PuzzleDefinition {
	const canonicalUrl = asString(data.canonicalUrl) ?? '';
	const normalizedUrl = asString(data.canonicalUrlNormalized) ?? canonicalUrl;
	const tags = normalizeTags(asStringArray(data.tags) ?? []);
	const archiveRecord = asRecord(data.archive);
	const unlimitedRecord = asRecord(data.unlimited);
	const imageRecord = asRecord(data.image);

	return {
		id: asString(data.id) ?? docId,
		title: asString(data.title) ?? inferTitleFromUrl(canonicalUrl || normalizedUrl),
		canonicalUrl: canonicalUrl || normalizedUrl,
		canonicalUrlNormalized: normalizedUrl || canonicalUrl || undefined,
		description: asString(data.description),
		tags,
		siteName: asString(data.siteName),
		archive: {
			enabled: Boolean(archiveRecord?.enabled ?? data.archiveEnabled),
			url: asString(archiveRecord?.url) ?? asString(data.archiveUrl),
			urlTemplate: asString(archiveRecord?.urlTemplate) ?? asString(data.archiveUrlTemplate),
			notes: asString(archiveRecord?.notes) ?? asString(data.archiveNotes)
		},
		unlimited: {
			enabled: Boolean(unlimitedRecord?.enabled ?? data.unlimitedEnabled),
			url: asString(unlimitedRecord?.url) ?? asString(data.unlimitedUrl),
			urlTemplate: asString(unlimitedRecord?.urlTemplate) ?? asString(data.unlimitedUrlTemplate),
			notes: asString(unlimitedRecord?.notes) ?? asString(data.unlimitedNotes)
		},
		image: imageRecord
			? {
					mode: (asString(imageRecord.mode) as PuzzleImageMode | undefined) ?? 'auto',
					previewUrl: asString(imageRecord.previewUrl),
					customUrl: asString(imageRecord.customUrl),
					storagePath: asString(imageRecord.storagePath),
					approvedUrl: asString(imageRecord.approvedUrl),
					faviconUrl: asString(imageRecord.faviconUrl)
				}
			: undefined,
		active: data.active !== false,
		source: 'canonical'
	};
}

async function findCanonicalPuzzleByUrl(normalizedUrl: string) {
	if (!isFirebaseConfigured) {
		return null;
	}

	try {
		const puzzlesRef = collection(getFirebaseDb(), 'puzzles');
		const byNormalized = await getDocs(
			query(puzzlesRef, where('canonicalUrlNormalized', '==', normalizedUrl), limit(1))
		);

		if (!byNormalized.empty) {
			const found = byNormalized.docs[0];
			return mapFirestorePuzzle(found.id, found.data());
		}

		const byCanonical = await getDocs(
			query(puzzlesRef, where('canonicalUrl', '==', normalizedUrl), limit(1))
		);
		if (!byCanonical.empty) {
			const found = byCanonical.docs[0];
			return mapFirestorePuzzle(found.id, found.data());
		}
	} catch {
		return null;
	}

	return null;
}

async function fetchMetadataForUrl(url: string): Promise<ResolvedMetadata | null> {
	const metadataEndpoint = import.meta.env.PUBLIC_PUZZLE_METADATA_ENDPOINT as string | undefined;
	if (!metadataEndpoint) {
		return null;
	}

	const headers: Record<string, string> = {
		'content-type': 'application/json'
	};

	try {
		const user = isFirebaseConfigured ? getFirebaseAuth().currentUser : null;
		if (user) {
			headers.authorization = `Bearer ${await user.getIdToken()}`;
		}
	} catch {
		// If token retrieval fails we still allow the fetch attempt; endpoint may not require auth.
	}

	const response = await fetch(metadataEndpoint, {
		method: 'POST',
		headers,
		body: JSON.stringify({ url })
	});

	if (!response.ok) {
		throw new Error(`Metadata lookup failed (${response.status})`);
	}

	const payload = await response.json();
	return parseMetadataPayload(payload);
}

function buildPrefillFromMetadata(
	url: string,
	metadata: ResolvedMetadata | null
): PuzzleDraftInput {
	const canonicalUrl = metadata?.canonicalUrl ?? url;
	const tags = metadata?.tags ? normalizeTags(metadata.tags) : [];

	return {
		title: metadata?.title ?? inferTitleFromUrl(canonicalUrl),
		canonicalUrl,
		description: metadata?.description ?? '',
		tags,
		siteName: metadata?.siteName,
		imageMode: metadata?.imageUrl ? 'auto' : undefined,
		imagePreviewUrl: metadata?.imageUrl,
		imageCustomUrl: metadata?.imageUrl,
		imageFaviconUrl: metadata?.faviconUrl,
		archiveEnabled: Boolean(metadata?.archiveUrl),
		archiveUrl: metadata?.archiveUrl,
		archiveUrlTemplate: metadata?.archiveUrlTemplate,
		unlimitedEnabled: Boolean(metadata?.unlimitedUrl),
		unlimitedUrl: metadata?.unlimitedUrl,
		unlimitedUrlTemplate: metadata?.unlimitedUrlTemplate
	};
}

export async function resolvePuzzleUrl({
	url,
	catalog
}: ResolveArgs): Promise<PuzzleUrlResolution> {
	const normalizedUrl = normalizePuzzleUrl(url);
	const localMatch = catalog.find(
		(puzzle) =>
			puzzle.canonicalUrlNormalized === normalizedUrl ||
			puzzle.canonicalUrl === normalizedUrl ||
			(puzzle.canonicalUrl && normalizePuzzleUrl(puzzle.canonicalUrl) === normalizedUrl)
	);

	if (localMatch) {
		return {
			kind: 'existing',
			source: 'local',
			puzzle: localMatch
		};
	}

	const firestoreMatch = await findCanonicalPuzzleByUrl(normalizedUrl);
	if (firestoreMatch) {
		return {
			kind: 'existing',
			source: 'firestore',
			puzzle: firestoreMatch
		};
	}

	try {
		const metadata = await fetchMetadataForUrl(normalizedUrl);
		return {
			kind: 'prefill',
			source: metadata ? 'metadata_endpoint' : 'fallback',
			prefill: buildPrefillFromMetadata(normalizedUrl, metadata),
			metadata
		};
	} catch {
		return {
			kind: 'prefill',
			source: 'fallback',
			prefill: buildPrefillFromMetadata(normalizedUrl, null),
			metadata: null
		};
	}
}

export function createCanonicalPuzzleFromDraft(draft: PuzzleDraftInput): PuzzleDefinition {
	const normalizedUrl = normalizePuzzleUrl(draft.canonicalUrl);
	const id = `canonical-${createPuzzleIdFromUrl(normalizedUrl)}`;

	return {
		id,
		title: draft.title.trim(),
		canonicalUrl: normalizedUrl,
		canonicalUrlNormalized: normalizedUrl,
		description: draft.description?.trim() || undefined,
		tags: normalizeTags(draft.tags),
		siteName: draft.siteName?.trim() || undefined,
		archive: {
			enabled: Boolean(draft.archiveEnabled),
			url: draft.archiveEnabled ? asString(draft.archiveUrl) : undefined,
			urlTemplate: draft.archiveEnabled ? asString(draft.archiveUrlTemplate) : undefined
		},
		unlimited: {
			enabled: Boolean(draft.unlimitedEnabled),
			url: draft.unlimitedEnabled ? asString(draft.unlimitedUrl) : undefined,
			urlTemplate: draft.unlimitedEnabled ? asString(draft.unlimitedUrlTemplate) : undefined
		},
		image:
			draft.imageCustomUrl || draft.imagePreviewUrl || draft.imageFaviconUrl
				? {
						mode: draft.imageMode ?? (draft.imageCustomUrl ? 'url' : 'auto'),
						previewUrl: asString(draft.imagePreviewUrl),
						customUrl: asString(draft.imageCustomUrl),
						approvedUrl: asString(draft.imageCustomUrl) ?? asString(draft.imagePreviewUrl),
						faviconUrl: asString(draft.imageFaviconUrl)
					}
				: undefined,
		active: true,
		source: 'canonical'
	};
}
