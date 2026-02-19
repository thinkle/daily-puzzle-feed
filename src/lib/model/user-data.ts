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

/**
 * A manually-entered seed streak for a puzzle.
 * Represents "my consecutive streak was `value` days as of `date`".
 * Used to carry over streaks built before the user started using this app.
 */
export type PuzzleStreakSeed = {
	value: number;
	date: string; // ISO date string when the seed was entered
};

/** Streak seeds keyed by puzzle ID */
export type StreakSeedsMap = Record<string, PuzzleStreakSeed>;

export type UserFeedData = {
	feedPuzzleIds: string[];
	plays: PlaysMap;
	streakSeeds?: StreakSeedsMap;
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
 *
 * If a `seed` is provided, it is added when the consecutive chain reaches the seed
 * boundary, minus any days at-or-before the seed date that were already counted
 * from app records (to avoid double-counting).
 */
export function calculateStreak(history: PuzzlePlayHistory, seed?: PuzzleStreakSeed): number {
	const todayStr = getTodayDateString();
	const todayPlayed = history[todayStr]?.progress === 'played';

	let streak = todayPlayed ? 1 : 0;
	// Track app-recorded days at/before seed.date so we don't double-count them
	let appDaysAtOrBeforeSeed = seed && todayStr <= seed.date && todayPlayed ? 1 : 0;

	const checkDate = new Date();
	checkDate.setDate(checkDate.getDate() - 1); // start at yesterday

	while (true) {
		const dateStr = dateToString(checkDate);
		if (history[dateStr]?.progress === 'played') {
			streak++;
			if (seed && dateStr <= seed.date) appDaysAtOrBeforeSeed++;
			checkDate.setDate(checkDate.getDate() - 1);
		} else if (seed && dateStr <= seed.date) {
			// Reached the seed boundary — add the seed value, subtracting any days
			// within the seed period already counted from app records.
			streak += seed.value - appDaysAtOrBeforeSeed;
			break;
		} else {
			break;
		}
	}

	return streak;
}
