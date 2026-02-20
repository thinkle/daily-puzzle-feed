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
	documentId,
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
		source: 'canonical',
		ranking: typeof data.ranking === 'number' ? data.ranking : 0
	};
}

export type UpdateApprovedPuzzleArgs = {
	puzzleId: string;
	title: string;
	canonicalUrl: string;
	description?: string;
	tags: PuzzleTag[];
	siteName?: string;
	ranking?: number;
};

export async function updateApprovedPuzzle({
	puzzleId,
	title,
	canonicalUrl,
	description,
	tags,
	siteName,
	ranking
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
		siteName: siteName?.trim() || null,
		ranking: typeof ranking === 'number' ? ranking : 0
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
		const snapshots = await getDocs(query(collection(getFirebaseDb(), 'puzzles'), limit(maxResults)));

		return snapshots.docs
			.map((snapshot) => mapFirestorePuzzle(snapshot.id, snapshot.data()))
			.filter((puzzle) => puzzle.active)
			.sort((a, b) => a.title.localeCompare(b.title));
	} catch {
		return [];
	}
}

export async function listPuzzlesByIds(puzzleIds: string[]): Promise<PuzzleDefinition[]> {
	if (!isFirebaseConfigured) {
		return [];
	}

	const uniqueIds = [...new Set(puzzleIds.map((id) => id.trim()).filter(Boolean))];
	if (uniqueIds.length === 0) {
		return [];
	}

	const db = getFirebaseDb();
	const resultsById = new Map<string, PuzzleDefinition>();

	try {
		const chunkSize = 10;
		for (let index = 0; index < uniqueIds.length; index += chunkSize) {
			const chunk = uniqueIds.slice(index, index + chunkSize);
			const snapshots = await getDocs(
				query(collection(db, 'puzzles'), where(documentId(), 'in', chunk))
			);

			for (const snapshot of snapshots.docs) {
				const puzzle = mapFirestorePuzzle(snapshot.id, snapshot.data());
				resultsById.set(puzzle.id, puzzle);
			}
		}
	} catch {
		return [];
	}

	return uniqueIds
		.map((id) => resultsById.get(id))
		.filter((puzzle): puzzle is PuzzleDefinition => Boolean(puzzle));
}
