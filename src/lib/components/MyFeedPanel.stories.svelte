<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import MyFeedPanel from './MyFeedPanel.svelte';
	import type { PuzzleDefinition } from '$lib/model/puzzle';
	import type { PlaysMap, StreakSeedsMap } from '$lib/model/user-data';
	import { getTodayDateString } from '$lib/model/user-data';

	const puzzles: PuzzleDefinition[] = [
		{
			id: 'wordle',
			title: 'Wordle',
			canonicalUrl: 'https://example.com/wordle',
			description: 'Guess the 5-letter word in six tries.',
			tags: ['word_games', 'wordle_like'],
			archive: { enabled: false },
			unlimited: { enabled: false },
			active: true,
			source: 'canonical'
		},
		{
			id: 'worldle',
			title: 'Worldle',
			canonicalUrl: 'https://example.com/worldle',
			description: 'Guess the country from its silhouette.',
			tags: ['geography'],
			archive: { enabled: true, url: 'https://example.com/worldle/archive' },
			unlimited: { enabled: false },
			active: true,
			source: 'canonical'
		},
		{
			id: 'nerdle',
			title: 'Nerdle',
			canonicalUrl: 'https://example.com/nerdle',
			description: 'A math equation guessing game.',
			tags: ['math'],
			archive: { enabled: false },
			unlimited: { enabled: true, url: 'https://example.com/nerdle/unlimited' },
			active: true,
			source: 'canonical'
		},
		{
			id: 'framed',
			title: 'Framed',
			canonicalUrl: 'https://example.com/framed',
			description: 'Guess the movie from a single frame.',
			tags: ['film'],
			archive: { enabled: false },
			unlimited: { enabled: false },
			active: true,
			source: 'canonical'
		}
	];

	const today = getTodayDateString();

	function dateStrDaysAgo(daysAgo: number): string {
		const d = new Date();
		d.setDate(d.getDate() - daysAgo);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function buildConsecutivePlays(
		daysCount: number,
		outcome: string = 'won'
	): PlaysMap[string] {
		const result: PlaysMap[string] = {};
		for (let i = 0; i < daysCount; i++) {
			result[dateStrDaysAgo(i)] = { progress: 'played', outcome: outcome as 'won' | 'lost' | 'unknown' };
		}
		return result;
	}

	const noPlays: PlaysMap = {};

	const visitedVsUnplayed: PlaysMap = {
		wordle: { [today]: { progress: 'visited' } }
	};

	const somePlays: PlaysMap = {
		wordle: { [today]: { progress: 'played', outcome: 'won' } },
		worldle: { [today]: { progress: 'played', outcome: 'lost' } },
		nerdle: { [today]: { progress: 'visited' } }
	};

	const allPlays: PlaysMap = {
		wordle: { [today]: { progress: 'played', outcome: 'won' } },
		worldle: { [today]: { progress: 'played', outcome: 'lost' } },
		nerdle: { [today]: { progress: 'played', outcome: 'unknown' } },
		framed: { [today]: { progress: 'played', outcome: 'won' } }
	};

	// Streak stories data
	const streakPlays: PlaysMap = {
		wordle: buildConsecutivePlays(7, 'won'),
		worldle: buildConsecutivePlays(3, 'lost'),
		nerdle: buildConsecutivePlays(1, 'won')
	};

	// Seed story: wordle has 4 consecutive days plus a seed of 100 set 4 days ago,
	// making the displayed streak 100 + 3 (newer days not double-counted) = 103.
	const seedDate = dateStrDaysAgo(3);
	const seededPlays: PlaysMap = {
		wordle: {
			[today]: { progress: 'played', outcome: 'won' },
			[dateStrDaysAgo(1)]: { progress: 'played', outcome: 'won' },
			[dateStrDaysAgo(2)]: { progress: 'played', outcome: 'won' },
			[seedDate]: { progress: 'played', outcome: 'won' }
		}
	};
	const streakSeeds: StreakSeedsMap = {
		wordle: { value: 100, date: seedDate }
	};

	const { Story } = defineMeta({
		title: 'App/MyFeedPanel',
		component: MyFeedPanel,
		tags: ['autodocs'],
		args: {
			feedPuzzles: puzzles,
			plays: noPlays,
			streakSeeds: {},
			onPlayClick: fn(),
			onMarkPlayed: fn(),
			onRemove: fn(),
			onSetStreakSeed: fn()
		}
	});
</script>

<script lang="ts">
	import ContainBase from './ContainBase.svelte';
</script>

<ContainBase />

<Story name="Nothing played yet" />

<Story name="Play clicked vs not started" args={{ plays: visitedVsUnplayed }} />

<Story name="Some done" args={{ plays: somePlays }} />

<Story name="All done" args={{ plays: allPlays }} />

<Story name="With streaks" args={{ plays: streakPlays }} />

<Story name="With streak seed" args={{ plays: seededPlays, streakSeeds }} />

<Story name="Empty feed" args={{ feedPuzzles: [] }} />
