export type PuzzleLinkMode = {
	enabled: boolean;
	url?: string;
	urlTemplate?: string;
	notes?: string;
};

export type PuzzleDefinition = {
	id: string;
	title: string;
	canonicalUrl: string;
	description?: string;
	tags: string[];
	archive: PuzzleLinkMode;
	unlimited: PuzzleLinkMode;
	active: boolean;
	source: 'seed' | 'user';
};

export type PuzzleDraftInput = {
	title: string;
	canonicalUrl: string;
	description?: string;
	tags?: string | string[];
	archiveEnabled?: boolean;
	archiveUrl?: string;
	archiveUrlTemplate?: string;
	archiveNotes?: string;
	unlimitedEnabled?: boolean;
	unlimitedUrl?: string;
	unlimitedUrlTemplate?: string;
	unlimitedNotes?: string;
};

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
		const parsed = new URL(url);
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
	const idBase = createPuzzleIdFromUrl(draft.canonicalUrl);
	const archiveEnabled = Boolean(draft.archiveEnabled);
	const unlimitedEnabled = Boolean(draft.unlimitedEnabled);

	return {
		id: `custom-${idBase}`,
		title: draft.title.trim(),
		canonicalUrl: draft.canonicalUrl.trim(),
		description: draft.description?.trim() || undefined,
		tags: normalizeTags(draft.tags),
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
		active: true,
		source: 'user'
	};
}
