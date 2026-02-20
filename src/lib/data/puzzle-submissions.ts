import { getFirebaseDb, isFirebaseConfigured } from '$lib/firebase/client';
import {
	createPuzzleIdFromUrl,
	normalizePuzzleUrl,
	normalizeTags,
	type PuzzleDraftInput,
	type PuzzleDefinition,
	type PuzzleImageMode,
	type PuzzleTag,
	type PuzzleSubmission,
	type PuzzleSubmissionStatus
} from '$lib/model/puzzle';
import { createCanonicalPuzzleFromDraft } from '$lib/data/puzzle-resolver';
import {
	addDoc,
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	query,
	runTransaction,
	serverTimestamp,
	where,
	type DocumentData,
	type Timestamp
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

type SavePuzzleSubmissionArgs = {
	uid: string;
	email?: string | null;
	displayName?: string | null;
	draft: PuzzleDraftInput;
	resolveSource: 'metadata_endpoint' | 'fallback' | 'manual';
	metadata?: Record<string, unknown> | null;
};

type ReviewPuzzleSubmissionArgs = {
	submissionId: string;
	reviewer: {
		uid: string;
		email?: string | null;
		displayName?: string | null;
	};
};

type UpdatePendingPuzzleSubmissionArgs = {
	submissionId: string;
	title: string;
	canonicalUrl: string;
	description?: string;
	tags: PuzzleTag[];
	siteName?: string;
	editor: {
		uid: string;
		email?: string | null;
		displayName?: string | null;
	};
};

function asString(value: unknown) {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
}

function timestampToMs(value: unknown) {
	const asTimestamp = value as Timestamp | undefined;
	return asTimestamp?.toMillis?.();
}

function stripUndefinedDeep(value: unknown): unknown {
	if (value === undefined) {
		return undefined;
	}

	if (Array.isArray(value)) {
		return value
			.map((entry) => stripUndefinedDeep(entry))
			.filter((entry) => entry !== undefined);
	}

	if (value && typeof value === 'object') {
		const cleaned: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
			const nextValue = stripUndefinedDeep(entry);
			if (nextValue !== undefined) {
				cleaned[key] = nextValue;
			}
		}
		return cleaned;
	}

	return value;
}

function mapSubmission(docId: string, data: DocumentData): PuzzleSubmission {
	const archive = asRecord(data.archive);
	const unlimited = asRecord(data.unlimited);
	const image = asRecord(data.image);
	const submittedBy = asRecord(data.submittedBy);
	const reviewedBy = asRecord(data.reviewedBy);

	return {
		id: docId,
		status: (asString(data.status) as PuzzleSubmissionStatus) ?? 'pending',
		title: asString(data.title) ?? 'Untitled Puzzle',
		canonicalUrl: asString(data.canonicalUrl) ?? '',
		canonicalUrlNormalized: asString(data.canonicalUrlNormalized),
		description: asString(data.description),
		tags: normalizeTags(data.tags as string[] | undefined),
		siteName: asString(data.siteName),
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
		resolveSource:
			(asString(data.resolveSource) as PuzzleSubmission['resolveSource']) ?? 'manual',
		submittedBy: {
			uid: asString(submittedBy?.uid) ?? '',
			email: asString(submittedBy?.email) ?? null,
			displayName: asString(submittedBy?.displayName) ?? null
		},
		createdAtMs: timestampToMs(data.createdAt),
		updatedAtMs: timestampToMs(data.updatedAt),
		reviewedAtMs: timestampToMs(data.reviewedAt),
		reviewedBy: reviewedBy
			? {
					uid: asString(reviewedBy.uid) ?? '',
					email: asString(reviewedBy.email) ?? null,
					displayName: asString(reviewedBy.displayName) ?? null
				}
			: undefined
	};
}

export async function savePuzzleSubmission({
	uid,
	email,
	displayName,
	draft,
	resolveSource,
	metadata
}: SavePuzzleSubmissionArgs): Promise<string | null> {
	if (!isFirebaseConfigured) {
		return null;
	}

	const canonicalUrlNormalized = normalizePuzzleUrl(draft.canonicalUrl);
	const tags = normalizeTags(draft.tags);
	const cleanedMetadata = stripUndefinedDeep(metadata);
	const firestoreMetadata =
		cleanedMetadata &&
		typeof cleanedMetadata === 'object' &&
		!Array.isArray(cleanedMetadata) &&
		Object.keys(cleanedMetadata as Record<string, unknown>).length === 0
			? null
			: cleanedMetadata ?? null;

	try {
		const docRef = await addDoc(collection(getFirebaseDb(), 'puzzle_submissions'), {
			status: 'pending',
			submittedBy: {
				uid,
				email: email ?? null,
				displayName: displayName ?? null
			},
			title: draft.title.trim(),
			canonicalUrl: canonicalUrlNormalized,
			canonicalUrlNormalized,
			description: draft.description?.trim() || null,
			tags,
			siteName: draft.siteName?.trim() || null,
			image: {
				mode: draft.imageMode ?? (draft.imageCustomUrl ? 'url' : 'auto'),
				previewUrl: draft.imagePreviewUrl?.trim() || null,
				customUrl: draft.imageCustomUrl?.trim() || null,
				faviconUrl: draft.imageFaviconUrl?.trim() || null,
				approvedUrl: draft.imageCustomUrl?.trim() || draft.imagePreviewUrl?.trim() || null
			},
			archive: {
				enabled: Boolean(draft.archiveEnabled),
				url: draft.archiveEnabled ? draft.archiveUrl?.trim() || null : null,
				urlTemplate: draft.archiveEnabled ? draft.archiveUrlTemplate?.trim() || null : null,
				notes: draft.archiveEnabled ? draft.archiveNotes?.trim() || null : null
			},
			unlimited: {
				enabled: Boolean(draft.unlimitedEnabled),
				url: draft.unlimitedEnabled ? draft.unlimitedUrl?.trim() || null : null,
				urlTemplate: draft.unlimitedEnabled ? draft.unlimitedUrlTemplate?.trim() || null : null,
				notes: draft.unlimitedEnabled ? draft.unlimitedNotes?.trim() || null : null
			},
			resolveSource,
			metadata: firestoreMetadata,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp()
		});

		return docRef.id;
	} catch (error) {
		if (error instanceof FirebaseError) {
			throw new Error(`Failed to save submission (${error.code}): ${error.message}`);
		}

		throw error instanceof Error ? error : new Error('Failed to save submission.');
	}
}

export async function listPendingPuzzleSubmissions(maxResults = 50): Promise<PuzzleSubmission[]> {
	if (!isFirebaseConfigured) {
		return [];
	}

	const db = getFirebaseDb();
	const submissionsById = new Map<string, PuzzleSubmission>();

	const pendingSnap = await getDocs(
		query(collection(db, 'puzzle_submissions'), where('status', '==', 'pending'), limit(maxResults))
	);
	for (const submissionDoc of pendingSnap.docs) {
		const mapped = mapSubmission(submissionDoc.id, submissionDoc.data());
		submissionsById.set(mapped.id, mapped);
	}

	// Backfill compatibility: older submissions may not have `status`.
	if (submissionsById.size < maxResults) {
		const fallbackSnap = await getDocs(
			query(collection(db, 'puzzle_submissions'), limit(maxResults * 3))
		);

		for (const submissionDoc of fallbackSnap.docs) {
			const mapped = mapSubmission(submissionDoc.id, submissionDoc.data());
			if (mapped.status === 'pending') {
				submissionsById.set(mapped.id, mapped);
			}
		}
	}

	return [...submissionsById.values()]
		.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0))
		.slice(0, maxResults);
}

function mapSubmissionToCustomPuzzle(submission: PuzzleSubmission): PuzzleDefinition {
	const normalizedUrl = normalizePuzzleUrl(submission.canonicalUrl);
	const id = `custom-${createPuzzleIdFromUrl(normalizedUrl)}`;

	return {
		id,
		title: submission.title,
		canonicalUrl: normalizedUrl,
		canonicalUrlNormalized: normalizedUrl,
		description: submission.description,
		tags: submission.tags,
		siteName: submission.siteName,
		image: submission.image,
		archive: submission.archive,
		unlimited: submission.unlimited,
		active: true,
		source: 'user'
	};
}

export async function listUserSubmittedPuzzles(
	uid: string,
	maxResults = 250
): Promise<PuzzleDefinition[]> {
	if (!isFirebaseConfigured) {
		return [];
	}

	try {
		const snapshots = await getDocs(
			query(
				collection(getFirebaseDb(), 'puzzle_submissions'),
				where('submittedBy.uid', '==', uid),
				limit(maxResults)
			)
		);

		const puzzlesById = new Map<string, PuzzleDefinition>();
		for (const snapshot of snapshots.docs) {
			const submission = mapSubmission(snapshot.id, snapshot.data());
			if (!submission.canonicalUrl) {
				continue;
			}

			const puzzle = mapSubmissionToCustomPuzzle(submission);
			puzzlesById.set(puzzle.id, puzzle);
		}

		return [...puzzlesById.values()];
	} catch {
		return [];
	}
}

export async function approvePuzzleSubmission({
	submissionId,
	reviewer
}: ReviewPuzzleSubmissionArgs) {
	if (!isFirebaseConfigured) {
		return null;
	}

	const db = getFirebaseDb();
	const submissionRef = doc(db, 'puzzle_submissions', submissionId);
	const submissionSnap = await getDoc(submissionRef);
	if (!submissionSnap.exists()) {
		return null;
	}

	const submission = mapSubmission(submissionSnap.id, submissionSnap.data());
	if (submission.status !== 'pending') {
		return null;
	}

	const draft: PuzzleDraftInput = {
		title: submission.title,
		canonicalUrl: submission.canonicalUrl,
		description: submission.description,
		tags: submission.tags,
		siteName: submission.siteName,
		imageMode: submission.image?.mode,
		imagePreviewUrl: submission.image?.previewUrl,
		imageCustomUrl: submission.image?.customUrl,
		imageFaviconUrl: submission.image?.faviconUrl,
		archiveEnabled: submission.archive.enabled,
		archiveUrl: submission.archive.url,
		archiveUrlTemplate: submission.archive.urlTemplate,
		archiveNotes: submission.archive.notes,
		unlimitedEnabled: submission.unlimited.enabled,
		unlimitedUrl: submission.unlimited.url,
		unlimitedUrlTemplate: submission.unlimited.urlTemplate,
		unlimitedNotes: submission.unlimited.notes
	};

	const canonicalPuzzle = createCanonicalPuzzleFromDraft(draft);
	const canonicalRef = doc(db, 'puzzles', canonicalPuzzle.id);
	const archive = {
		enabled: canonicalPuzzle.archive.enabled,
		...(canonicalPuzzle.archive.url ? { url: canonicalPuzzle.archive.url } : {}),
		...(canonicalPuzzle.archive.urlTemplate
			? { urlTemplate: canonicalPuzzle.archive.urlTemplate }
			: {}),
		...(canonicalPuzzle.archive.notes ? { notes: canonicalPuzzle.archive.notes } : {})
	};
	const unlimited = {
		enabled: canonicalPuzzle.unlimited.enabled,
		...(canonicalPuzzle.unlimited.url ? { url: canonicalPuzzle.unlimited.url } : {}),
		...(canonicalPuzzle.unlimited.urlTemplate
			? { urlTemplate: canonicalPuzzle.unlimited.urlTemplate }
			: {}),
		...(canonicalPuzzle.unlimited.notes ? { notes: canonicalPuzzle.unlimited.notes } : {})
	};
	const image = canonicalPuzzle.image
		? {
				mode: canonicalPuzzle.image.mode,
				...(canonicalPuzzle.image.previewUrl ? { previewUrl: canonicalPuzzle.image.previewUrl } : {}),
				...(canonicalPuzzle.image.customUrl ? { customUrl: canonicalPuzzle.image.customUrl } : {}),
				...(canonicalPuzzle.image.storagePath ? { storagePath: canonicalPuzzle.image.storagePath } : {}),
				...(canonicalPuzzle.image.approvedUrl ? { approvedUrl: canonicalPuzzle.image.approvedUrl } : {}),
				...(canonicalPuzzle.image.faviconUrl ? { faviconUrl: canonicalPuzzle.image.faviconUrl } : {})
			}
		: null;

	await runTransaction(db, async (transaction) => {
		transaction.set(
			canonicalRef,
			{
				id: canonicalPuzzle.id,
				title: canonicalPuzzle.title,
				canonicalUrl: canonicalPuzzle.canonicalUrl,
				canonicalUrlNormalized: canonicalPuzzle.canonicalUrlNormalized,
				description: canonicalPuzzle.description ?? null,
				tags: canonicalPuzzle.tags,
				siteName: canonicalPuzzle.siteName ?? null,
				image,
				archive,
				unlimited,
				active: true,
				source: 'canonical',
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp()
			},
			{ merge: true }
		);

		transaction.update(submissionRef, {
			status: 'approved',
			approvedPuzzleId: canonicalPuzzle.id,
			reviewedBy: {
				uid: reviewer.uid,
				email: reviewer.email ?? null,
				displayName: reviewer.displayName ?? null
			},
			reviewedAt: serverTimestamp(),
			updatedAt: serverTimestamp()
		});
	});

	return canonicalPuzzle;
}

export async function rejectPuzzleSubmission({ submissionId, reviewer }: ReviewPuzzleSubmissionArgs) {
	if (!isFirebaseConfigured) {
		return false;
	}

	try {
		await runTransaction(getFirebaseDb(), async (transaction) => {
			const submissionRef = doc(getFirebaseDb(), 'puzzle_submissions', submissionId);
			const submissionSnap = await transaction.get(submissionRef);
			if (!submissionSnap.exists()) {
				return;
			}

			transaction.update(submissionRef, {
				status: 'rejected',
				reviewedBy: {
					uid: reviewer.uid,
					email: reviewer.email ?? null,
					displayName: reviewer.displayName ?? null
				},
				reviewedAt: serverTimestamp(),
				updatedAt: serverTimestamp()
			});
		});
		return true;
	} catch {
		return false;
	}
}

export async function updatePendingPuzzleSubmission({
	submissionId,
	title,
	canonicalUrl,
	description,
	tags,
	siteName,
	editor
}: UpdatePendingPuzzleSubmissionArgs): Promise<PuzzleSubmission | null> {
	if (!isFirebaseConfigured) {
		return null;
	}

	const normalizedUrl = normalizePuzzleUrl(canonicalUrl);
	const normalizedTags = normalizeTags(tags);
	const cleanedTitle = title.trim();
	if (!cleanedTitle) {
		throw new Error('Title is required.');
	}

	const db = getFirebaseDb();
	const submissionRef = doc(db, 'puzzle_submissions', submissionId);

	await runTransaction(db, async (transaction) => {
		const submissionSnap = await transaction.get(submissionRef);
		if (!submissionSnap.exists()) {
			throw new Error('Submission not found.');
		}

		const status = asString(submissionSnap.data().status) ?? 'pending';
		if (status !== 'pending') {
			throw new Error('Only pending submissions can be edited.');
		}

		transaction.update(submissionRef, {
			title: cleanedTitle,
			canonicalUrl: normalizedUrl,
			canonicalUrlNormalized: normalizedUrl,
			description: description?.trim() || null,
			tags: normalizedTags,
			siteName: siteName?.trim() || null,
			lastEditedBy: {
				uid: editor.uid,
				email: editor.email ?? null,
				displayName: editor.displayName ?? null
			},
			updatedAt: serverTimestamp()
		});
	});

	const updatedSnap = await getDoc(submissionRef);
	if (!updatedSnap.exists()) {
		return null;
	}

	return mapSubmission(updatedSnap.id, updatedSnap.data());
}
