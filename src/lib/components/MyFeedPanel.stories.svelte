<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import MyFeedPanel from './MyFeedPanel.svelte';
	import type { PuzzleDefinition } from '$lib/model/puzzle';
	import type { PlaysMap } from '$lib/model/user-data';
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

	const noPlays: PlaysMap = {};

	const somePlays: PlaysMap = {
		wordle: { [today]: { progress: 'played', outcome: 'won' } },
		worldle: { [today]: { progress: 'played', outcome: 'lost' } }
	};

	const allPlays: PlaysMap = {
		wordle: { [today]: { progress: 'played', outcome: 'won' } },
		worldle: { [today]: { progress: 'played', outcome: 'lost' } },
		nerdle: { [today]: { progress: 'played', outcome: 'unknown' } },
		framed: { [today]: { progress: 'played', outcome: 'won' } }
	};

	const { Story } = defineMeta({
		title: 'App/MyFeedPanel',
		component: MyFeedPanel,
		tags: ['autodocs'],
		args: {
			feedPuzzles: puzzles,
			plays: noPlays,
			onPlayClick: fn(),
			onMarkPlayed: fn(),
			onRemove: fn()
		}
	});
</script>

<script lang="ts">
	import ContainBase from './ContainBase.svelte';
</script>

<ContainBase />

<Story name="Nothing played yet" />

<Story name="Some done" args={{ plays: somePlays }} />

<Story name="All done" args={{ plays: allPlays }} />

<Story name="Empty feed" args={{ feedPuzzles: [] }} />
