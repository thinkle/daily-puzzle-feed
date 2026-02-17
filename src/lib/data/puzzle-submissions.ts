import { getFirebaseDb, isFirebaseConfigured } from '$lib/firebase/client';
import { normalizePuzzleUrl, normalizeTags, type PuzzleDraftInput } from '$lib/model/puzzle';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

type SavePuzzleSubmissionArgs = {
	uid: string;
	email?: string | null;
	displayName?: string | null;
	draft: PuzzleDraftInput;
	resolveSource: 'metadata_endpoint' | 'fallback' | 'manual';
	metadata?: Record<string, unknown> | null;
};

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
