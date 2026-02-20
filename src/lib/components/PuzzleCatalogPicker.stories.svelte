<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import PuzzleCatalogPicker from './PuzzleCatalogPicker.svelte';
	import type { PuzzleDefinition } from '$lib/model/puzzle';

	const sampleCatalog: PuzzleDefinition[] = [
		{
			id: 'wordle',
			title: 'Wordle',
			canonicalUrl: 'https://www.nytimes.com/games/wordle',
			description: 'Guess the hidden word in 6 tries. A new puzzle is available each day.',
			tags: ['word_games', 'wordle_like'],
			archive: { enabled: false },
			unlimited: { enabled: false },
			active: true,
			source: 'canonical',
			ranking: 10
		},
		{
			id: 'connections',
			title: 'Connections',
			canonicalUrl: 'https://www.nytimes.com/games/connections',
			description: 'Group words that share a common thread. A new puzzle every day.',
			tags: ['word_games'],
			archive: { enabled: false },
			unlimited: { enabled: false },
			active: true,
			source: 'canonical',
			ranking: 8
		},
		{
			id: 'nerdle',
			title: 'Nerdle',
			canonicalUrl: 'https://nerdlegame.com',
			description: 'Daily number challenge — guess the calculation.',
			tags: ['math', 'wordle_like'],
			archive: { enabled: false },
			unlimited: { enabled: false },
			active: true,
			source: 'canonical',
			ranking: 5
		},
		{
			id: 'heardle',
			title: 'Heardle Daily',
			canonicalUrl: 'https://www.heardle.app',
			description: 'Guess the song from a short clip. A new challenge every day.',
			tags: ['music'],
			archive: { enabled: false },
			unlimited: { enabled: false },
			active: true,
			source: 'canonical',
			ranking: 3
		},
		{
			id: 'worldle',
			title: 'Worldle',
			canonicalUrl: 'https://worldle.teuteuf.fr',
			description: 'Guess the country from its outline shape in 6 attempts.',
			tags: ['geography'],
			archive: { enabled: false },
			unlimited: { enabled: false },
			active: true,
			source: 'canonical',
			ranking: 4
		},
		{
			id: 'angle',
			title: 'Angle',
			canonicalUrl: 'https://angle.wtf',
			description: 'Guess the angle in 3 tries. A daily geometry puzzle.',
			tags: ['math', 'wordle_like'],
			archive: { enabled: false },
			unlimited: { enabled: false },
			active: true,
			source: 'canonical',
			ranking: 2
		}
	];

	const { Story } = defineMeta({
		title: 'App/PuzzleCatalogPicker',
		component: PuzzleCatalogPicker,
		tags: ['autodocs'],
		args: {
			catalog: sampleCatalog,
			addedPuzzleIds: [],
			onAdd: fn(),
			onEditPuzzle: fn()
		}
	});
</script>

<Story name="Default" />

<Story name="Some Already Added" args={{ addedPuzzleIds: ['wordle', 'heardle'] }} />

<Story name="Admin View" args={{ isAdmin: true, addedPuzzleIds: ['connections'] }} />
