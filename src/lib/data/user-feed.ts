import { getFirebaseDb, isFirebaseConfigured } from '$lib/firebase/client';
import type {
	PuzzlePlayEntry,
	PuzzleStreakSeed,
	PlaysMap,
	StreakSeedsMap,
	UserFeedData
} from '$lib/model/user-data';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

function getUserDocRef(uid: string) {
	return doc(getFirebaseDb(), 'users', uid);
}

export async function loadUserFeed(uid: string): Promise<UserFeedData> {
	const empty: UserFeedData = { feedPuzzleIds: [], plays: {} };

	if (!isFirebaseConfigured) {
		return empty;
	}

	try {
		const snap = await getDoc(getUserDocRef(uid));
		if (!snap.exists()) {
			return empty;
		}

		const data = snap.data();
		return {
			feedPuzzleIds: Array.isArray(data.feedPuzzleIds) ? (data.feedPuzzleIds as string[]) : [],
			plays: (typeof data.plays === 'object' && data.plays !== null
				? data.plays
				: {}) as PlaysMap,
			streakSeeds: (typeof data.streakSeeds === 'object' && data.streakSeeds !== null
				? data.streakSeeds
				: {}) as StreakSeedsMap
		};
	} catch {
		return empty;
	}
}

export async function saveUserFeedPuzzleIds(uid: string, feedPuzzleIds: string[]): Promise<void> {
	if (!isFirebaseConfigured) {
		return;
	}

	await setDoc(getUserDocRef(uid), { feedPuzzleIds }, { merge: true });
}

export async function saveStreakSeed(
	uid: string,
	puzzleId: string,
	seed: PuzzleStreakSeed
): Promise<void> {
	if (!isFirebaseConfigured) {
		return;
	}

	const ref = getUserDocRef(uid);
	const snap = await getDoc(ref);

	if (!snap.exists()) {
		await setDoc(ref, {
			feedPuzzleIds: [],
			plays: {},
			streakSeeds: { [puzzleId]: seed }
		});
		return;
	}

	await updateDoc(ref, {
		[`streakSeeds.${puzzleId}`]: seed
	});
}

export async function savePlayEntry(
	uid: string,
	puzzleId: string,
	date: string,
	entry: PuzzlePlayEntry
): Promise<void> {
	if (!isFirebaseConfigured) {
		return;
	}

	const ref = getUserDocRef(uid);
	const snap = await getDoc(ref);

	if (!snap.exists()) {
		await setDoc(ref, {
			feedPuzzleIds: [],
			plays: { [puzzleId]: { [date]: entry } }
		});
		return;
	}

	await updateDoc(ref, {
		[`plays.${puzzleId}.${date}`]: entry
	});
}
