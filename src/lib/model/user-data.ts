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

export function getTodayDateString(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
