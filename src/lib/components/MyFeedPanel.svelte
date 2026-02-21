<script lang="ts">
	import { Accordion, Button, ButtonLink, Input, Tag } from 'contain-css-svelte';
	import { getPuzzleDisplayImageUrl } from '$lib/model/puzzle';
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

	let {
		feedPuzzles,
		plays,
		streakSeeds = {},
		onPlayClick,
		onMarkPlayed,
		onRemove,
		onSetStreakSeed = () => {}
	}: Props = $props();

	let sortByStreak = $state(false);
	let isEditMode = $state(false);
	let editingSeedFor = $state<string | null>(null);
	let seedInputValue = $state('');

	function getTodayPlayEntry(puzzleId: string) {
		const today = getTodayDateString();
		return plays[puzzleId]?.[today];
	}

	function getStreak(puzzleId: string): number {
		return calculateStreak(plays[puzzleId] ?? {}, streakSeeds[puzzleId]);
	}

	function startEditingSeed(puzzleId: string) {
		editingSeedFor = puzzleId;
		seedInputValue = String(streakSeeds[puzzleId]?.value ?? '');
	}

	function saveSeed(puzzleId: string) {
		const value = Number.parseInt(seedInputValue, 10);
		if (Number.isFinite(value) && value > 0) {
			onSetStreakSeed(puzzleId, { value, date: getTodayDateString() });
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
	{@const hasPlayableUrl = Boolean(puzzle.canonicalUrl)}
	{@const imageUrl = getPuzzleDisplayImageUrl(puzzle) ?? puzzle.image?.faviconUrl}
	<li class="puzzle-row" class:visited={isVisited} class:played={isPlayed}>
		<div class="row-info">
			<div class="row-main">
				{#if imageUrl}
					<img class="row-thumb" src={imageUrl} alt="" />
				{/if}
				<span class="row-title">{puzzle.title}</span>
				{#if isPlayed}
					{#if todayPlay.outcome === 'won'}
						<Tag success>Won</Tag>
					{:else if todayPlay.outcome === 'lost'}
						<Tag danger>Lost</Tag>
					{:else if todayPlay.outcome === 'completed' || todayPlay.outcome === 'unknown'}
						<Tag info>Completed</Tag>
					{:else}
						<Tag info>Completed</Tag>
					{/if}
				{:else if isVisited}
					<Tag info>Awaiting result</Tag>
				{:else}
					<Tag>Not started</Tag>
				{/if}
				{#if !hasPlayableUrl}
					<Tag danger>Missing URL</Tag>
				{/if}
			</div>
			<div class="streak-controls">
				<span class="streak-label">Streak</span>
				<Button
					secondary
					--button-padding="0.12rem 0.45rem"
					--button-shadow-distance="0"
					--button-shadow-blur="0"
					--button-border-radius="999px"
					--button-font-size="0.8em"
					--button-margin="0"
					aria-label={`Edit streak for ${puzzle.title}`}
					onclick={() => startEditingSeed(puzzle.id)}
				>
					{streak}d
				</Button>
			</div>
		</div>
		<div class="row-actions-primary">
			{#if !isVisited && !isPlayed}
				{#if hasPlayableUrl}
					<ButtonLink
						href={puzzle.canonicalUrl}
						target="_blank"
						rel="noopener noreferrer"
						onclick={() => onPlayClick(puzzle.id)}
						primary
					>
						Play
					</ButtonLink>
				{:else}
					<Button secondary disabled>Unavailable</Button>
				{/if}
			{:else if isVisited && !isPlayed}
				<Button success onclick={() => onMarkPlayed(puzzle.id, 'won')}>Won</Button>
				<Button danger onclick={() => onMarkPlayed(puzzle.id, 'lost')}>Lost</Button>
				<Button info onclick={() => onMarkPlayed(puzzle.id, 'completed')}>Completed</Button>
				{#if hasPlayableUrl}
					<ButtonLink
						href={puzzle.canonicalUrl}
						target="_blank"
						rel="noopener noreferrer"
						onclick={() => onPlayClick(puzzle.id)}
						secondary
						--button-padding="0.4rem 0.6rem"
					>
						Back to puzzle
					</ButtonLink>
				{/if}
			{/if}
		</div>
		<div class="row-actions-secondary">
			{#if isEditMode}
				<Button danger --button-padding="0.3rem 0.65rem" onclick={() => onRemove(puzzle.id)}
					>Remove</Button
				>
			{/if}
		</div>
		{#if editingSeedFor === puzzle.id}
			<div class="seed-form">
				<span class="seed-label">Current streak:</span>
				<Input
					type="number"
					min="1"
					placeholder="0"
					--input-width="6rem"
					--input-padding="0.3rem 0.5rem"
					--input-bg="var(--secondary-bg)"
					--input-fg="var(--secondary-fg)"
					--input-border="var(--border-width, 1px) var(--border-style, solid) var(--border-color)"
					bind:value={seedInputValue}
					onkeydown={(e) => e.key === 'Enter' && saveSeed(puzzle.id)}
				/>
				<Button primary --button-padding="0.3rem 0.65rem" onclick={() => saveSeed(puzzle.id)}
					>Save</Button
				>
				<Button --button-padding="0.3rem 0.65rem" onclick={() => (editingSeedFor = null)}
					>Cancel</Button
				>
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
			<span class="progress-text"
				>{feedPuzzles.length} puzzle{feedPuzzles.length === 1 ? '' : 's'} to do</span
			>
		{/if}
		{#if feedPuzzles.length > 0}
			<Button secondary onclick={() => (isEditMode = !isEditMode)}>
				{isEditMode ? 'Done editing' : 'Edit list'}
			</Button>
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
		<div class="feed-list-group">
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
				<Accordion
					--accordion-wrapper-border="none"
					--accordion-wrapper-padding="0"
					--accordion-gap="0"
					--accordion-summary-square-radius="0"
					--accordion-summary-border="none"
				>
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
		</div>
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

	.feed-list-group {
		border: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
		border-radius: var(--border-radius);
		overflow: hidden;
		max-width: 800px;
	}

	.puzzle-list {
		max-width: 800px;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.puzzle-row {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
		padding: var(--space-lg) var(--padding);
		flex-wrap: wrap;
		border-bottom: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
		--button-margin: 0;
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
		justify-content: space-between;
		gap: var(--space-lg);
		flex: 1;
		min-width: 8rem;
		flex-wrap: wrap;
	}

	.row-main {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.row-thumb {
		width: 2rem;
		height: 2rem;
		border-radius: var(--border-radius);
		object-fit: cover;
		flex-shrink: 0;
	}

	.row-title {
		font-weight: var(--bold);
		font-family: var(--heading-font-family);
	}

	.row-actions-primary {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
		align-items: center;
	}

	.row-actions-secondary {
		display: flex;
		align-items: center;
	}

	.streak-controls {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.streak-label {
		font-size: 0.8em;
		color: var(--secondary-fg, var(--fg));
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
		font-size: 0.875em;
	}

	@media (max-width: 700px) {
		.puzzle-row {
			gap: var(--space);
			padding: var(--space-md) var(--space-md);
		}

		.row-info {
			gap: var(--space);
		}

		.row-main {
			gap: var(--space);
		}

		.feed-header {
			gap: var(--space-md);
		}

		.streak-controls {
			gap: var(--space);
		}
	}
</style>
