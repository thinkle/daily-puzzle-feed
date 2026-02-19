<script lang="ts">
	import { Accordion, Button, ButtonLink, Tag } from 'contain-css-svelte';
	import type { PuzzleDefinition } from '$lib/model/puzzle';
	import {
		getTodayDateString,
		calculateStreak,
		type PlaysMap,
		type PuzzleOutcome
	} from '$lib/model/user-data';

	type Props = {
		feedPuzzles: PuzzleDefinition[];
		plays: PlaysMap;
		onPlayClick: (puzzleId: string) => void;
		onMarkPlayed: (puzzleId: string, outcome: PuzzleOutcome) => void;
		onRemove: (puzzleId: string) => void;
	};

	let { feedPuzzles, plays, onPlayClick, onMarkPlayed, onRemove }: Props = $props();

	let sortByStreak = $state(false);

	function getTodayPlayEntry(puzzleId: string) {
		const today = getTodayDateString();
		return plays[puzzleId]?.[today];
	}

	function getStreak(puzzleId: string): number {
		return calculateStreak(plays[puzzleId] ?? {});
	}

	const pendingPuzzles = $derived(
		feedPuzzles.filter((p) => getTodayPlayEntry(p.id)?.progress !== 'played')
	);
	const donePuzzles = $derived(
		feedPuzzles.filter((p) => getTodayPlayEntry(p.id)?.progress === 'played')
	);

	const sortedPendingPuzzles = $derived.by(() => {
		if (!sortByStreak) return pendingPuzzles;
		return [...pendingPuzzles].sort((a, b) => getStreak(b.id) - getStreak(a.id));
	});
	const sortedDonePuzzles = $derived.by(() => {
		if (!sortByStreak) return donePuzzles;
		return [...donePuzzles].sort((a, b) => getStreak(b.id) - getStreak(a.id));
	});
</script>

{#snippet puzzleRow(puzzle: PuzzleDefinition)}
	{@const todayPlay = getTodayPlayEntry(puzzle.id)}
	{@const isVisited = todayPlay?.progress === 'visited'}
	{@const isPlayed = todayPlay?.progress === 'played'}
	{@const streak = getStreak(puzzle.id)}
	<li class="puzzle-row" class:visited={isVisited} class:played={isPlayed}>
		<div class="row-info">
			<span class="row-title">{puzzle.title}</span>
			{#if isPlayed}
				{#if todayPlay.outcome === 'won'}
					<Tag success>Won</Tag>
				{:else if todayPlay.outcome === 'lost'}
					<Tag danger>Lost</Tag>
				{:else}
					<Tag secondary>Played</Tag>
				{/if}
			{:else if isVisited}
				<Tag info>In progress</Tag>
			{/if}
			{#if streak >= 1}
				<span class="streak-badge" title="{streak}-day streak">{streak}d</span>
			{/if}
		</div>
		<div class="row-actions">
			<ButtonLink
				href={puzzle.canonicalUrl}
				target="_blank"
				rel="noopener noreferrer"
				onclick={() => onPlayClick(puzzle.id)}
				primary
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
			{#if !isPlayed}
				<Button secondary onclick={() => onMarkPlayed(puzzle.id, 'won')}>Won</Button>
				<Button secondary onclick={() => onMarkPlayed(puzzle.id, 'lost')}>Lost</Button>
				<Button secondary onclick={() => onMarkPlayed(puzzle.id, 'unknown')}>Played</Button>
			{/if}
			<Button onclick={() => onRemove(puzzle.id)}>Remove</Button>
		</div>
	</li>
{/snippet}

<section class="my-feed">
	<div class="feed-header">
		<h2>My Puzzle Feed</h2>
		{#if donePuzzles.length > 0}
			<span class="progress-text">{donePuzzles.length} of {feedPuzzles.length} done today</span>
		{:else if feedPuzzles.length > 0}
			<span class="progress-text">{feedPuzzles.length} puzzle{feedPuzzles.length === 1 ? '' : 's'} to do</span>
		{/if}
		{#if feedPuzzles.length > 1}
			<Button secondary onclick={() => (sortByStreak = !sortByStreak)}>
				{sortByStreak ? 'Sorted by streak' : 'Sort by streak'}
			</Button>
		{/if}
	</div>
	{#if feedPuzzles.length === 0}
		<p>No puzzles in your feed yet. Add some from the "Add Puzzle" tab!</p>
	{:else}
		{#if sortedPendingPuzzles.length > 0}
			<ul class="puzzle-list">
				{#each sortedPendingPuzzles as puzzle (puzzle.id)}
					{@render puzzleRow(puzzle)}
				{/each}
			</ul>
		{:else}
			<p class="all-done">All done for today!</p>
		{/if}
		{#if sortedDonePuzzles.length > 0}
			<Accordion>
				<details open={sortedPendingPuzzles.length === 0}>
					<summary>Done today ({sortedDonePuzzles.length})</summary>
					<ul class="puzzle-list">
						{#each sortedDonePuzzles as puzzle (puzzle.id)}
							{@render puzzleRow(puzzle)}
						{/each}
					</ul>
				</details>
			</Accordion>
		{/if}
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

	.feed-header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.progress-text {
		color: var(--secondary-fg, var(--fg));
		font-size: 0.9em;
	}

	.puzzle-list {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius, 8px);
		overflow: hidden;
	}

	.puzzle-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.75rem;
		flex-wrap: wrap;
		border-bottom: 1px solid var(--border-color);
	}

	.puzzle-row:last-child {
		border-bottom: none;
	}

	.puzzle-row.visited {
		background: color-mix(in srgb, var(--info-bg, #03a9f4) 8%, transparent);
	}

	.puzzle-row.played {
		opacity: 0.75;
	}

	.row-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 8rem;
	}

	.row-title {
		font-weight: 600;
	}

	.row-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.streak-badge {
		font-size: 0.72em;
		font-weight: 700;
		padding: 0.15em 0.45em;
		border-radius: 999px;
		background: color-mix(in srgb, var(--warning-bg, #ff9800) 18%, transparent);
		color: var(--warning-fg, #b45309);
		border: 1px solid color-mix(in srgb, var(--warning-bg, #ff9800) 35%, transparent);
		white-space: nowrap;
	}
</style>
