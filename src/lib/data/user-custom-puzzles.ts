import { getFirebaseDb, isFirebaseConfigured } from '$lib/firebase/client';
import type { PuzzleDefinition, PuzzleImageMode } from '$lib/model/puzzle';
import {
	collection,
	doc,
	documentId,
	getDocs,
	query,
	serverTimestamp,
	setDoc,
	where,
	type DocumentData
} from 'firebase/firestore';

function asString(value: unknown) {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
}

function mapPuzzleDoc(docId: string, data: DocumentData): PuzzleDefinition {
	const archive = asRecord(data.archive);
	const unlimited = asRecord(data.unlimited);
	const image = asRecord(data.image);

	return {
		id: asString(data.id) ?? docId,
		title: asString(data.title) ?? 'Untitled Puzzle',
		canonicalUrl: asString(data.canonicalUrl) ?? '',
		canonicalUrlNormalized: asString(data.canonicalUrlNormalized),
		description: asString(data.description),
		tags: Array.isArray(data.tags) ? (data.tags as PuzzleDefinition['tags']) : [],
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
		source: 'user'
	};
}

export async function saveUserCustomPuzzle(uid: string, puzzle: PuzzleDefinition): Promise<void> {
	if (!isFirebaseConfigured) {
		return;
	}

	const puzzleRef = doc(getFirebaseDb(), 'users', uid, 'custom_puzzles', puzzle.id);

	await setDoc(
		puzzleRef,
		{
			id: puzzle.id,
			title: puzzle.title,
			canonicalUrl: puzzle.canonicalUrl,
			canonicalUrlNormalized: puzzle.canonicalUrlNormalized ?? null,
			description: puzzle.description ?? null,
			tags: puzzle.tags,
			siteName: puzzle.siteName ?? null,
			archive: {
				enabled: puzzle.archive.enabled,
				url: puzzle.archive.url ?? null,
				urlTemplate: puzzle.archive.urlTemplate ?? null,
				notes: puzzle.archive.notes ?? null
			},
			unlimited: {
				enabled: puzzle.unlimited.enabled,
				url: puzzle.unlimited.url ?? null,
				urlTemplate: puzzle.unlimited.urlTemplate ?? null,
				notes: puzzle.unlimited.notes ?? null
			},
			image: puzzle.image
				? {
						mode: puzzle.image.mode,
						previewUrl: puzzle.image.previewUrl ?? null,
						customUrl: puzzle.image.customUrl ?? null,
						storagePath: puzzle.image.storagePath ?? null,
						approvedUrl: puzzle.image.approvedUrl ?? null,
						faviconUrl: puzzle.image.faviconUrl ?? null
					}
				: null,
			active: puzzle.active,
			source: 'user',
			updatedAt: serverTimestamp()
		},
		{ merge: true }
	);
}

export async function listUserCustomPuzzlesByIds(
	uid: string,
	puzzleIds: string[]
): Promise<PuzzleDefinition[]> {
	if (!isFirebaseConfigured) {
		return [];
	}

	const uniqueIds = [...new Set(puzzleIds.map((id) => id.trim()).filter(Boolean))];
	if (uniqueIds.length === 0) {
		return [];
	}

	const puzzlesRef = collection(getFirebaseDb(), 'users', uid, 'custom_puzzles');
	const resultsById = new Map<string, PuzzleDefinition>();

	try {
		const chunkSize = 10;
		for (let index = 0; index < uniqueIds.length; index += chunkSize) {
			const chunk = uniqueIds.slice(index, index + chunkSize);
			const snapshots = await getDocs(query(puzzlesRef, where(documentId(), 'in', chunk)));
			for (const snapshot of snapshots.docs) {
				const puzzle = mapPuzzleDoc(snapshot.id, snapshot.data());
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
