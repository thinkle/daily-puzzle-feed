<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Card, Tag } from 'contain-css-svelte';
	import {
		getPuzzleDisplayImageUrl,
		PUZZLE_TAG_LABELS,
		type PuzzleDefinition,
		type PuzzleSubmission,
		type PuzzleTag
	} from '$lib/model/puzzle';

	type PuzzleLike = Pick<
		PuzzleDefinition,
		'title' | 'canonicalUrl' | 'description' | 'tags' | 'image'
	>;

	type Props = {
		puzzle: PuzzleLike;
		actions?: Snippet;
	};

	let { puzzle, actions }: Props = $props();

	let expanded = $state(false);

	const imageUrl = $derived(getPuzzleDisplayImageUrl(puzzle));

	function toggleExpanded() {
		expanded = !expanded;
	}
</script>

<Card --card-footer-padding="0.5rem" --card-header-height="auto">
	{#snippet header()}
		<h3>{puzzle.title}</h3>
	{/snippet}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="card-body" onclick={toggleExpanded}>
		{#if imageUrl}
			<img class="puzzle-image" src={imageUrl} alt={`${puzzle.title} preview`} />
		{/if}
		<div class="tag-row">
			{#each puzzle.tags as tag (tag)}
				<Tag>{PUZZLE_TAG_LABELS[tag] ?? tag}</Tag>
			{/each}
		</div>
		{#if expanded && puzzle.description}
			<p class="description">{puzzle.description}</p>
		{/if}
	</div>
	{#snippet footer()}
		{#if actions}
			<div class="actions">
				{@render actions()}
			</div>
		{/if}
	{/snippet}
</Card>

<style>
	h3,
	p {
		margin: 0;
	}

	.card-body {
		display: grid;
		gap: 0.5rem;
		text-align: left;
		width: 100%;
		cursor: pointer;
	}

	.puzzle-image {
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius, 8px);
		aspect-ratio: 1.91 / 1;
		object-fit: cover;
		width: 100%;
	}

	.tag-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.description {
		font-size: 0.9em;
		color: var(--secondary-fg, var(--fg));
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
</style>
