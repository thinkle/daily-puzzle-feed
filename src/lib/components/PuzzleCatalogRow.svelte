<script lang="ts">
	import { MiniButton, Tag } from 'contain-css-svelte';
	import {
		getPuzzleDisplayImageUrl,
		PUZZLE_TAG_LABELS,
		type PuzzleDefinition,
		type PuzzleTag
	} from '$lib/model/puzzle';

	type Props = {
		puzzle: PuzzleDefinition;
		isAdded?: boolean;
		isAdmin?: boolean;
		onAdd?: (puzzle: PuzzleDefinition) => void;
		onEdit?: (puzzle: PuzzleDefinition) => void;
	};

	let { puzzle, isAdded = false, isAdmin = false, onAdd = () => {}, onEdit = () => {} }: Props =
		$props();

	const imageUrl = $derived(getPuzzleDisplayImageUrl(puzzle) ?? puzzle.image?.faviconUrl);
</script>

<li class="catalog-row" class:added={isAdded}>
	<div class="row-top">
		{#if imageUrl}
			<img class="row-thumb" src={imageUrl} alt="" />
		{:else}
			<span class="row-thumb-placeholder"></span>
		{/if}
		<span class="row-title">{puzzle.title}</span>
		<div class="row-actions">
			{#if isAdmin}
				<MiniButton onclick={() => onEdit(puzzle)} aria-label="Edit {puzzle.title}">&#9998;</MiniButton>
			{/if}
			{#if isAdded}
				<MiniButton disabled aria-label="Already added">&#10003;</MiniButton>
			{:else}
				<MiniButton primary onclick={() => onAdd(puzzle)} aria-label="Add {puzzle.title}"><svg width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor"><path d="M7 1h2v6h6v2H9v6H7V9H1V7h6z"/></svg></MiniButton>
			{/if}
		</div>
	</div>
	<div class="row-bottom">
		{#if puzzle.description}
			<span class="row-description">{puzzle.description}</span>
		{/if}
		<div class="row-tags">
			{#each puzzle.tags as tag (tag)}
				<Tag --tag-font-size="0.7em" --tag-padding="0.1em 0.4em"
					>{PUZZLE_TAG_LABELS[tag] ?? tag}</Tag
				>
			{/each}
		</div>
	</div>
</li>

<style>
	.catalog-row {
		display: grid;
		gap: var(--space);
		padding: var(--space-md) var(--space-lg);
		border-bottom: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
		min-width: 0;
		overflow: hidden;
	}

	.catalog-row:last-child {
		border-bottom: none;
	}

	.catalog-row.added {
		opacity: 0.6;
	}

	.row-top {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		min-height: 1.5rem;
		overflow: hidden;
	}

	.row-thumb {
		width: 2rem;
		height: 2rem;
		border-radius: var(--border-radius);
		object-fit: cover;
		flex-shrink: 0;
	}

	.row-thumb-placeholder {
		width: 2rem;
		height: 2rem;
		border-radius: var(--border-radius);
		background: var(--inactive-bg);
		flex-shrink: 0;
	}

	.row-title {
		flex: 1;
		font-weight: var(--bold, 600);
		font-family: var(--heading-font-family);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.row-actions {
		display: flex;
		gap: var(--space);
		flex-shrink: 0;
		--button-margin: 0;
		--button-bg: var(--inactive-bg);
	}

	.row-bottom {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space);
		padding-left: calc(2rem + var(--space-md));
		font-size: 0.8em;
		min-height: 0;
		overflow: hidden;
	}

	.row-description {
		flex-basis: 100%;
		color: var(--secondary-fg, var(--fg));
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.row-tags {
		display: flex;
		gap: var(--space);
		flex-wrap: wrap;
	}
</style>
