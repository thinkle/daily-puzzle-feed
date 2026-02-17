import type { PuzzleDefinition } from '$lib/model/puzzle';

export const seedPuzzleCatalog: PuzzleDefinition[] = [
	{
		id: 'nytimes-wordle',
		title: 'Wordle',
		canonicalUrl: 'https://www.nytimes.com/games/wordle/index.html',
		description: 'Guess the five-letter word in six tries.',
		tags: ['word', 'daily', 'wordle-like'],
		archive: {
			enabled: false
		},
		unlimited: {
			enabled: false
		},
		active: true,
		source: 'seed'
	},
	{
		id: 'nytimes-connections',
		title: 'Connections',
		canonicalUrl: 'https://www.nytimes.com/games/connections',
		description: 'Group related words into four hidden categories.',
		tags: ['word', 'logic', 'daily'],
		archive: {
			enabled: false
		},
		unlimited: {
			enabled: false
		},
		active: true,
		source: 'seed'
	},
	{
		id: 'nytimes-strands',
		title: 'Strands',
		canonicalUrl: 'https://www.nytimes.com/games/strands',
		description: 'Find themed words in a letter grid.',
		tags: ['word', 'daily'],
		archive: {
			enabled: false
		},
		unlimited: {
			enabled: false
		},
		active: true,
		source: 'seed'
	},
	{
		id: 'nytimes-mini-crossword',
		title: 'Mini Crossword',
		canonicalUrl: 'https://www.nytimes.com/crosswords/game/mini',
		description: 'Short daily crossword.',
		tags: ['crossword', 'word', 'daily'],
		archive: {
			enabled: true,
			url: 'https://www.nytimes.com/crosswords/game/mini'
		},
		unlimited: {
			enabled: false
		},
		active: true,
		source: 'seed'
	},
	{
		id: 'globle-game',
		title: 'Globle',
		canonicalUrl: 'https://globle-game.com/game',
		description: 'Guess the mystery country with proximity hints.',
		tags: ['geography', 'daily', 'map'],
		archive: {
			enabled: false
		},
		unlimited: {
			enabled: false
		},
		active: true,
		source: 'seed'
	},
	{
		id: 'travle-earth',
		title: 'Travle',
		canonicalUrl: 'https://travle.earth',
		description: 'Find the shortest country path between start and goal.',
		tags: ['geography', 'daily', 'route'],
		archive: {
			enabled: true,
			url: 'https://travle.earth'
		},
		unlimited: {
			enabled: false
		},
		active: true,
		source: 'seed'
	},
	{
		id: 'wafflegame',
		title: 'Waffle',
		canonicalUrl: 'https://wafflegame.net/daily',
		description: 'Reorder letters to solve interlocking words.',
		tags: ['word', 'daily', 'wordle-like'],
		archive: {
			enabled: true,
			url: 'https://wafflegame.net/archive'
		},
		unlimited: {
			enabled: true,
			url: 'https://wafflegame.net'
		},
		active: true,
		source: 'seed'
	},
	{
		id: 'framed-wtf',
		title: 'Framed',
		canonicalUrl: 'https://framed.wtf',
		description: 'Guess the movie from still frames.',
		tags: ['movies', 'trivia', 'daily'],
		archive: {
			enabled: true,
			url: 'https://framed.wtf/archive'
		},
		unlimited: {
			enabled: false
		},
		active: true,
		source: 'seed'
	}
];

export function getSeedPuzzleCatalog() {
	return [...seedPuzzleCatalog];
}

export function getSeedPuzzleById(id: string) {
	return seedPuzzleCatalog.find((puzzle) => puzzle.id === id) ?? null;
}
