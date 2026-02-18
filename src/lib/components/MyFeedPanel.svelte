<script lang="ts">
	import { Button, ButtonLink, GridLayout } from 'contain-css-svelte';
	import PuzzleCard from './PuzzleCard.svelte';
	import type { PuzzleDefinition } from '$lib/model/puzzle';
	import { getTodayDateString, type PlaysMap, type PuzzleOutcome } from '$lib/model/user-data';

	type Props = {
		feedPuzzles: PuzzleDefinition[];
		plays: PlaysMap;
		onPlayClick: (puzzleId: string) => void;
		onMarkPlayed: (puzzleId: string, outcome: PuzzleOutcome) => void;
		onRemove: (puzzleId: string) => void;
	};

	let { feedPuzzles, plays, onPlayClick, onMarkPlayed, onRemove }: Props = $props();

	function getTodayPlayEntry(puzzleId: string) {
		const today = getTodayDateString();
		return plays[puzzleId]?.[today];
	}
</script>

<section class="my-feed">
	<h2>My Puzzle Feed</h2>
	{#if feedPuzzles.length === 0}
		<p>No puzzles in your feed yet. Add some from the "Add Puzzle" tab!</p>
	{:else}
		<GridLayout
			--item-width="var(--card-width)"
			--gap="0.75rem"
			--grid-justify-content="start"
			--grid-place-content="start"
		>
			{#each feedPuzzles as puzzle (puzzle.id)}
				{@const todayPlay = getTodayPlayEntry(puzzle.id)}
				<PuzzleCard {puzzle}>
					{#snippet actions()}
						<ButtonLink
							href={puzzle.canonicalUrl}
							target="_blank"
							rel="noopener noreferrer"
							onclick={() => onPlayClick(puzzle.id)}
						>
							Play
						</ButtonLink>
						{#if puzzle.archive.enabled && puzzle.archive.url}
							<ButtonLink
								href={puzzle.archive.url}
								target="_blank"
								rel="noopener noreferrer"
								secondary
							>
								Archive
							</ButtonLink>
						{/if}
						{#if puzzle.unlimited.enabled && puzzle.unlimited.url}
							<ButtonLink
								href={puzzle.unlimited.url}
								target="_blank"
								rel="noopener noreferrer"
								secondary
							>
								Unlimited
							</ButtonLink>
						{/if}
						{#if todayPlay?.progress === 'played'}
							<Button disabled>
								{todayPlay.outcome === 'won'
									? 'Won'
									: todayPlay.outcome === 'lost'
										? 'Lost'
										: 'Played'}
							</Button>
						{:else}
							<Button secondary onclick={() => onMarkPlayed(puzzle.id, 'won')}>Won</Button>
							<Button secondary onclick={() => onMarkPlayed(puzzle.id, 'lost')}>Lost</Button>
							<Button secondary onclick={() => onMarkPlayed(puzzle.id, 'unknown')}>
								Played
							</Button>
						{/if}
						<Button onclick={() => onRemove(puzzle.id)}>Remove</Button>
					{/snippet}
				</PuzzleCard>
			{/each}
		</GridLayout>
	{/if}
</section>

<style>
	h2,
	p {
		margin: 0;
	}

	.my-feed {
		display: grid;
		gap: 0.75rem;
	}
</style>
