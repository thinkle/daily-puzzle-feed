import { getFirebaseDb, isFirebaseConfigured } from '$lib/firebase/client';
import {
	normalizePuzzleUrl,
	normalizeTags,
	type PuzzleDefinition,
	type PuzzleImageMode,
	type PuzzleTag
} from '$lib/model/puzzle';
import {
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	query,
	updateDoc,
	where,
	type DocumentData
} from 'firebase/firestore';

function asString(value: unknown) {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
}

function mapFirestorePuzzle(docId: string, data: DocumentData): PuzzleDefinition {
	const archive = asRecord(data.archive);
	const unlimited = asRecord(data.unlimited);
	const image = asRecord(data.image);

	return {
		id: asString(data.id) ?? docId,
		title: asString(data.title) ?? 'Untitled Puzzle',
		canonicalUrl: asString(data.canonicalUrl) ?? '',
		canonicalUrlNormalized: asString(data.canonicalUrlNormalized),
		description: asString(data.description),
		tags: normalizeTags(data.tags as string[] | undefined),
		siteName: asString(data.siteName),
		archive: {
			enabled: Boolean(archive?.enabled),
			url: asString(archive?.url),
			urlTemplate: asString(archive?.urlTemplate),
			notes: asString(archive?.notes)
		},
		unlimited: {
			enabled: Boolean(unlimited?.enabled),
			url: asString(unlimited?.url),
			urlTemplate: asString(unlimited?.urlTemplate),
			notes: asString(unlimited?.notes)
		},
		image: image
			? {
					mode: (asString(image.mode) as PuzzleImageMode | undefined) ?? 'auto',
					previewUrl: asString(image.previewUrl),
					customUrl: asString(image.customUrl),
					storagePath: asString(image.storagePath),
					approvedUrl: asString(image.approvedUrl),
					faviconUrl: asString(image.faviconUrl)
				}
			: undefined,
		active: data.active !== false,
		source: 'canonical'
	};
}

export type UpdateApprovedPuzzleArgs = {
	puzzleId: string;
	title: string;
	canonicalUrl: string;
	description?: string;
	tags: PuzzleTag[];
	siteName?: string;
};

export async function updateApprovedPuzzle({
	puzzleId,
	title,
	canonicalUrl,
	description,
	tags,
	siteName
}: UpdateApprovedPuzzleArgs): Promise<PuzzleDefinition | null> {
	if (!isFirebaseConfigured) {
		return null;
	}

	const cleanedTitle = title.trim();
	if (!cleanedTitle) {
		throw new Error('Title is required.');
	}

	const normalizedUrl = normalizePuzzleUrl(canonicalUrl);
	const normalizedTags = normalizeTags(tags);

	const db = getFirebaseDb();
	const puzzleRef = doc(db, 'puzzles', puzzleId);

	await updateDoc(puzzleRef, {
		title: cleanedTitle,
		canonicalUrl: normalizedUrl,
		canonicalUrlNormalized: normalizedUrl,
		description: description?.trim() || null,
		tags: normalizedTags,
		siteName: siteName?.trim() || null
	});

	const updatedSnap = await getDoc(puzzleRef);
	if (!updatedSnap.exists()) {
		return null;
	}

	return mapFirestorePuzzle(updatedSnap.id, updatedSnap.data());
}

export async function listApprovedPuzzles(maxResults = 500): Promise<PuzzleDefinition[]> {
	if (!isFirebaseConfigured) {
		return [];
	}

	try {
		const snapshots = await getDocs(
			query(collection(getFirebaseDb(), 'puzzles'), where('active', '==', true), limit(maxResults))
		);

		return snapshots.docs
			.map((snapshot) => mapFirestorePuzzle(snapshot.id, snapshot.data()))
			.sort((a, b) => a.title.localeCompare(b.title));
	} catch {
		return [];
	}
}
