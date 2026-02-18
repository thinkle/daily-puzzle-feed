<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PuzzleCard from './PuzzleCard.svelte';
	import type { PuzzleDefinition } from '$lib/model/puzzle';

	const samplePuzzle: PuzzleDefinition = {
		id: 'sample-wordle',
		title: 'Sample Word Game',
		canonicalUrl: 'https://example.com/word',
		canonicalUrlNormalized: 'https://example.com/word',
		description: 'A fun daily word game where you guess the hidden word in six tries.',
		tags: ['word_games', 'wordle_like'],
		archive: { enabled: true, url: 'https://example.com/word/archive' },
		unlimited: { enabled: false },
		image: {
			mode: 'url',
			approvedUrl: 'https://picsum.photos/seed/puzzle/400/200'
		},
		active: true,
		source: 'canonical'
	};

	const noImagePuzzle: PuzzleDefinition = {
		id: 'sample-geo',
		title: 'Geography Challenge',
		canonicalUrl: 'https://example.com/geo',
		description: 'Test your knowledge of world geography.',
		tags: ['geography', 'history'],
		archive: { enabled: false },
		unlimited: { enabled: true, url: 'https://example.com/geo/unlimited' },
		active: true,
		source: 'canonical'
	};

	const { Story } = defineMeta({
		title: 'App/PuzzleCard',
		component: PuzzleCard,
		tags: ['autodocs'],
		args: {
			puzzle: samplePuzzle
		}
	});
</script>

<script lang="ts">
	import { Button } from 'contain-css-svelte';
	import ContainBase from './ContainBase.svelte';
</script>

<ContainBase />

<Story name="With Add Button">
	<div style="max-width: 20rem;">
		<PuzzleCard puzzle={samplePuzzle}>
			{#snippet actions()}
				<Button primary>Add</Button>
			{/snippet}
		</PuzzleCard>
	</div>
</Story>

<Story name="Approve / Reject">
	<div style="max-width: 20rem;">
		<PuzzleCard puzzle={samplePuzzle}>
			{#snippet actions()}
				<Button primary>Approve</Button>
				<Button secondary>Reject</Button>
			{/snippet}
		</PuzzleCard>
	</div>
</Story>

<Story name="No Image">
	<div style="max-width: 20rem;">
		<PuzzleCard puzzle={noImagePuzzle}>
			{#snippet actions()}
				<Button primary>Add</Button>
			{/snippet}
		</PuzzleCard>
	</div>
</Story>

<Story name="No Actions">
	<div style="max-width: 20rem;">
		<PuzzleCard puzzle={samplePuzzle} />
	</div>
</Story>
