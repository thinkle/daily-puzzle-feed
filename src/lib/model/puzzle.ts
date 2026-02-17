export type PuzzleLinkMode = {
	enabled: boolean;
	url?: string;
	urlTemplate?: string;
	notes?: string;
};

export type PuzzleImageMode = 'auto' | 'url' | 'upload';

export type PuzzleImageMeta = {
	mode: PuzzleImageMode;
	previewUrl?: string;
	customUrl?: string;
	storagePath?: string;
	approvedUrl?: string;
	faviconUrl?: string;
};

export type PuzzleDefinition = {
	id: string;
	title: string;
	canonicalUrl: string;
	canonicalUrlNormalized?: string;
	description?: string;
	tags: string[];
	archive: PuzzleLinkMode;
	unlimited: PuzzleLinkMode;
	image?: PuzzleImageMeta;
	siteName?: string;
	active: boolean;
	source: 'seed' | 'user' | 'canonical';
};

export type PuzzleDraftInput = {
	title: string;
	canonicalUrl: string;
	description?: string;
	tags?: string | string[];
	siteName?: string;
	imageMode?: PuzzleImageMode;
	imagePreviewUrl?: string;
	imageCustomUrl?: string;
	imageFaviconUrl?: string;
	archiveEnabled?: boolean;
	archiveUrl?: string;
	archiveUrlTemplate?: string;
	archiveNotes?: string;
	unlimitedEnabled?: boolean;
	unlimitedUrl?: string;
	unlimitedUrlTemplate?: string;
	unlimitedNotes?: string;
};

const TRACKING_QUERY_PARAMS = new Set([
	'fbclid',
	'gclid',
	'igshid',
	'mc_cid',
	'mc_eid',
	'ref',
	'ref_src',
	'si',
	'source'
]);

export function normalizePuzzleUrl(url: string) {
	const parsed = new URL(url.trim());
	parsed.hash = '';
	parsed.hostname = parsed.hostname.toLowerCase();

	if (
		(parsed.protocol === 'https:' && parsed.port === '443') ||
		(parsed.protocol === 'http:' && parsed.port === '80')
	) {
		parsed.port = '';
	}

	const keptParams = [...parsed.searchParams.entries()]
		.filter(([key]) => {
			const lower = key.toLowerCase();
			return !lower.startsWith('utm_') && !TRACKING_QUERY_PARAMS.has(lower);
		})
		.sort(([a], [b]) => a.localeCompare(b));

	parsed.search = '';
	for (const [key, value] of keptParams) {
		parsed.searchParams.append(key, value);
	}

	if (parsed.pathname !== '/') {
		parsed.pathname = parsed.pathname.replace(/\/+$/g, '');
	}

	return parsed.toString();
}

export function arePuzzleUrlsEquivalent(urlA: string, urlB: string) {
	try {
		return normalizePuzzleUrl(urlA) === normalizePuzzleUrl(urlB);
	} catch {
		return urlA.trim() === urlB.trim();
	}
}

export function normalizeTags(input?: string | string[]): string[] {
	if (!input) {
		return [];
	}

	const rawTags = Array.isArray(input) ? input : input.split(',');

	return rawTags
		.map((tag) => tag.trim().toLowerCase())
		.filter(Boolean)
		.filter((tag, index, tags) => tags.indexOf(tag) === index);
}

export function createPuzzleIdFromUrl(url: string) {
	try {
		const parsed = new URL(normalizePuzzleUrl(url));
		const base = `${parsed.hostname}${parsed.pathname}`
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');

		return base || 'puzzle';
	} catch {
		return (
			url
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '') || 'puzzle'
		);
	}
}

export function createUserPuzzleDefinition(draft: PuzzleDraftInput): PuzzleDefinition {
	const normalizedCanonicalUrl = normalizePuzzleUrl(draft.canonicalUrl);
	const idBase = createPuzzleIdFromUrl(normalizedCanonicalUrl);
	const archiveEnabled = Boolean(draft.archiveEnabled);
	const unlimitedEnabled = Boolean(draft.unlimitedEnabled);
	const imageMode =
		draft.imageMode ??
		(draft.imageCustomUrl?.trim() ? 'url' : draft.imagePreviewUrl?.trim() ? 'auto' : undefined);

	return {
		id: `custom-${idBase}`,
		title: draft.title.trim(),
		canonicalUrl: normalizedCanonicalUrl,
		canonicalUrlNormalized: normalizedCanonicalUrl,
		description: draft.description?.trim() || undefined,
		tags: normalizeTags(draft.tags),
		siteName: draft.siteName?.trim() || undefined,
		archive: {
			enabled: archiveEnabled,
			url: archiveEnabled ? draft.archiveUrl?.trim() || undefined : undefined,
			urlTemplate: archiveEnabled ? draft.archiveUrlTemplate?.trim() || undefined : undefined,
			notes: archiveEnabled ? draft.archiveNotes?.trim() || undefined : undefined
		},
		unlimited: {
			enabled: unlimitedEnabled,
			url: unlimitedEnabled ? draft.unlimitedUrl?.trim() || undefined : undefined,
			urlTemplate: unlimitedEnabled ? draft.unlimitedUrlTemplate?.trim() || undefined : undefined,
			notes: unlimitedEnabled ? draft.unlimitedNotes?.trim() || undefined : undefined
		},
		image: imageMode
			? {
					mode: imageMode,
					previewUrl: draft.imagePreviewUrl?.trim() || undefined,
					customUrl: draft.imageCustomUrl?.trim() || undefined,
					faviconUrl: draft.imageFaviconUrl?.trim() || undefined,
					approvedUrl: draft.imageCustomUrl?.trim() || draft.imagePreviewUrl?.trim() || undefined
				}
			: undefined,
		active: true,
		source: 'user'
	};
}

export function getPuzzleDisplayImageUrl(puzzle: Pick<PuzzleDefinition, 'image'>) {
	if (!puzzle.image) {
		return undefined;
	}

	return (
		puzzle.image.approvedUrl ??
		puzzle.image.customUrl ??
		puzzle.image.previewUrl ??
		puzzle.image.faviconUrl
	);
}
