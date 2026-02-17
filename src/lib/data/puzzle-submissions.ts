import { getFirebaseDb, isFirebaseConfigured } from '$lib/firebase/client';
import {
	normalizePuzzleUrl,
	normalizeTags,
	type PuzzleDraftInput,
	type PuzzleImageMode,
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
			metadata: metadata ?? null,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp()
		});

		return docRef.id;
	} catch {
		return null;
	}
}

export async function listPendingPuzzleSubmissions(maxResults = 50): Promise<PuzzleSubmission[]> {
	if (!isFirebaseConfigured) {
		return [];
	}

	try {
		const submissionSnap = await getDocs(
			query(
				collection(getFirebaseDb(), 'puzzle_submissions'),
				where('status', '==', 'pending'),
				limit(maxResults)
			)
		);

		return submissionSnap.docs
			.map((submissionDoc) => mapSubmission(submissionDoc.id, submissionDoc.data()))
			.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
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
				image: canonicalPuzzle.image ?? null,
				archive: canonicalPuzzle.archive,
				unlimited: canonicalPuzzle.unlimited,
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
