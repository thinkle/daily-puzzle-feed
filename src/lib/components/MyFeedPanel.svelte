<script lang="ts">
	import { Accordion, Button, ButtonLink, Tag } from 'contain-css-svelte';
	import type { PuzzleDefinition } from '$lib/model/puzzle';
	import {
		getTodayDateString,
		calculateStreak,
		type PlaysMap,
		type PuzzleOutcome,
		type PuzzleStreakSeed,
		type StreakSeedsMap
	} from '$lib/model/user-data';

	type Props = {
		feedPuzzles: PuzzleDefinition[];
		plays: PlaysMap;
		streakSeeds: StreakSeedsMap;
		onPlayClick: (puzzleId: string) => void;
		onMarkPlayed: (puzzleId: string, outcome: PuzzleOutcome) => void;
		onRemove: (puzzleId: string) => void;
		onSetStreakSeed: (puzzleId: string, seed: PuzzleStreakSeed) => void;
	};

	let { feedPuzzles, plays, streakSeeds, onPlayClick, onMarkPlayed, onRemove, onSetStreakSeed }: Props =
		$props();

	let sortByStreak = $state(false);
	let editingSeedFor = $state<string | null>(null);
	let seedInputValue = $state(0);

	function getTodayPlayEntry(puzzleId: string) {
		const today = getTodayDateString();
		return plays[puzzleId]?.[today];
	}

	function getStreak(puzzleId: string): number {
		return calculateStreak(plays[puzzleId] ?? {}, streakSeeds[puzzleId]);
	}

	function startEditingSeed(puzzleId: string) {
		editingSeedFor = puzzleId;
		seedInputValue = streakSeeds[puzzleId]?.value ?? 0;
	}

	function saveSeed(puzzleId: string) {
		if (seedInputValue > 0) {
			onSetStreakSeed(puzzleId, { value: seedInputValue, date: getTodayDateString() });
		}
		editingSeedFor = null;
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
	{@const seed = streakSeeds[puzzle.id]}
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
			<Button secondary onclick={() => startEditingSeed(puzzle.id)}>
				{seed ? `Base: ${seed.value}` : 'Set streak'}
			</Button>
			<Button onclick={() => onRemove(puzzle.id)}>Remove</Button>
		</div>
		{#if editingSeedFor === puzzle.id}
			<div class="seed-form">
				<label class="seed-label">
					Streak before this app:
					<input
						class="seed-input"
						type="number"
						min="1"
						bind:value={seedInputValue}
						onkeydown={(e) => e.key === 'Enter' && saveSeed(puzzle.id)}
					/>
				</label>
				<Button primary onclick={() => saveSeed(puzzle.id)}>Save</Button>
				<Button onclick={() => (editingSeedFor = null)}>Cancel</Button>
			</div>
		{/if}
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
		gap: var(--gap);
	}

	.feed-header {
		display: flex;
		align-items: baseline;
		gap: var(--gap);
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
		border: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
		border-radius: var(--border-radius);
		overflow: hidden;
	}

	.puzzle-row {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
		padding: var(--space-lg) var(--padding);
		flex-wrap: wrap;
		border-bottom: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
	}

	.puzzle-row:last-child {
		border-bottom: none;
	}

	.puzzle-row.visited {
		background: color-mix(in srgb, var(--info-bg) 10%, var(--bg));
	}

	.puzzle-row.played {
		opacity: 0.75;
	}

	.row-info {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
		flex: 1;
		min-width: 8rem;
	}

	.row-title {
		font-weight: var(--bold);
	}

	.row-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.seed-form {
		flex: 1 0 100%;
		display: flex;
		align-items: center;
		gap: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
		flex-wrap: wrap;
	}

	.seed-label {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		font-size: 0.875em;
	}

	.seed-input {
		width: 5rem;
		padding: var(--space-md) var(--space-lg);
		border: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
		border-radius: var(--border-radius);
		font-size: inherit;
		background: var(--bg);
		color: var(--fg);
	}

	.streak-badge {
		font-size: 0.75em;
		font-weight: var(--bold);
		padding: 0.15em 0.45em;
		border-radius: 999px;
		background: color-mix(in srgb, var(--warning-bg) 15%, var(--bg));
		color: var(--warning-bg);
		border: var(--border-width, 1px) var(--border-style, solid)
			color-mix(in srgb, var(--warning-bg) 40%, transparent);
		white-space: nowrap;
	}
</style>
