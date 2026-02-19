export type PuzzleProgress = 'visited' | 'played';
export type PuzzleOutcome = 'won' | 'lost' | 'unknown';

export type PuzzlePlayEntry = {
	progress: PuzzleProgress;
	outcome?: PuzzleOutcome;
};

/** Per-puzzle play history, keyed by ISO date string (e.g. "2026-02-17") */
export type PuzzlePlayHistory = Record<string, PuzzlePlayEntry>;

/** All play data, keyed by puzzle ID */
export type PlaysMap = Record<string, PuzzlePlayHistory>;

export type UserFeedData = {
	feedPuzzleIds: string[];
	plays: PlaysMap;
};

function dateToString(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getTodayDateString(): string {
	return dateToString(new Date());
}

/**
 * Calculates the current streak for a puzzle.
 * Counts consecutive days (ending today if played, or yesterday if not yet played today)
 * where progress === 'played'.
 */
export function calculateStreak(history: PuzzlePlayHistory): number {
	const todayStr = getTodayDateString();
	const todayPlayed = history[todayStr]?.progress === 'played';

	let streak = todayPlayed ? 1 : 0;

	const checkDate = new Date();
	checkDate.setDate(checkDate.getDate() - 1); // start at yesterday

	while (true) {
		const dateStr = dateToString(checkDate);
		if (history[dateStr]?.progress === 'played') {
			streak++;
			checkDate.setDate(checkDate.getDate() - 1);
		} else {
			break;
		}
	}

	return streak;
}
