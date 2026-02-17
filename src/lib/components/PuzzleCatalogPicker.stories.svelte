<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import PuzzleCatalogPicker from './PuzzleCatalogPicker.svelte';
	import { getSeedPuzzleCatalog } from '$lib/data/puzzle-catalog';

	const seedCatalog = getSeedPuzzleCatalog();

	const { Story } = defineMeta({
		title: 'App/PuzzleCatalogPicker',
		component: PuzzleCatalogPicker,
		tags: ['autodocs'],
		args: {
			catalog: seedCatalog,
			addedPuzzleIds: [],
			onAddSelected: fn()
		}
	});
</script>

<Story name="Default" />

<Story name="Some Already Added" args={{ addedPuzzleIds: ['nytimes-wordle', 'wafflegame'] }} />
