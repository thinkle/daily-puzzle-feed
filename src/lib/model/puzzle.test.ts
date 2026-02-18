import { describe, expect, it } from 'vitest';
import { createUserPuzzleDefinition, normalizeTags } from './puzzle';

describe('normalizeTags', () => {
	it('maps aliases into controlled tag values', () => {
		expect(normalizeTags(['word', 'Wordle-like', 'movies', 'unknown'])).toEqual([
			'word_games',
			'wordle_like',
			'film'
		]);
	});

	it('deduplicates tags after normalization', () => {
		expect(normalizeTags('word_games, word games, WORD_GAMES')).toEqual(['word_games']);
	});
});

describe('createUserPuzzleDefinition', () => {
	it('creates a normalized puzzle definition from draft input', () => {
		const puzzle = createUserPuzzleDefinition({
			title: '  Sample Puzzle  ',
			canonicalUrl: 'https://example.com/play?utm_source=test',
			description: '  puzzle description ',
			tags: ['word', 'history'],
			imagePreviewUrl: 'https://example.com/preview.png',
			archiveEnabled: true,
			archiveUrl: 'https://example.com/archive'
		});

		expect(puzzle.title).toBe('Sample Puzzle');
		expect(puzzle.canonicalUrl).toBe('https://example.com/play');
		expect(puzzle.description).toBe('puzzle description');
		expect(puzzle.tags).toEqual(['word_games', 'history']);
		expect(puzzle.image?.mode).toBe('auto');
		expect(puzzle.archive.enabled).toBe(true);
		expect(puzzle.archive.url).toBe('https://example.com/archive');
		expect(puzzle.unlimited.enabled).toBe(false);
	});
});
