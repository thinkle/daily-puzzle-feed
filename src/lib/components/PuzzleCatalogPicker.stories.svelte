<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import PuzzleCatalogPicker from './PuzzleCatalogPicker.svelte';
	import type { PuzzleDefinition } from '$lib/model/puzzle';

	const sampleCatalog: PuzzleDefinition[] = [
		{
			id: 'sample-wordle',
			title: 'Sample Word Game',
			canonicalUrl: 'https://example.com/word',
			canonicalUrlNormalized: 'https://example.com/word',
			description: 'Sample catalog item for Storybook.',
			tags: ['word_games', 'wordle_like'],
			archive: { enabled: false },
			unlimited: { enabled: false },
			active: true,
			source: 'canonical'
		},
		{
			id: 'sample-geo',
			title: 'Sample Geo Puzzle',
			canonicalUrl: 'https://example.com/geo',
			canonicalUrlNormalized: 'https://example.com/geo',
			description: 'Second sample item.',
			tags: ['geography', 'history'],
			archive: { enabled: true, url: 'https://example.com/geo/archive' },
			unlimited: { enabled: false },
			active: true,
			source: 'canonical'
		}
	];

	const { Story } = defineMeta({
		title: 'App/PuzzleCatalogPicker',
		component: PuzzleCatalogPicker,
		tags: ['autodocs'],
		args: {
			catalog: sampleCatalog,
			addedPuzzleIds: [],
			onAddSelected: fn()
		}
	});
</script>

<Story name="Default" />

<Story name="Some Already Added" args={{ addedPuzzleIds: ['sample-wordle'] }} />
