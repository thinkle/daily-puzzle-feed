<script lang="ts">
	import { Button, Card, Form, FormItem, GridLayout, Input, Tag, Tile } from 'contain-css-svelte';
	import type { PuzzleDefinition } from '$lib/model/puzzle';

	type Props = {
		catalog: PuzzleDefinition[];
		addedPuzzleIds?: string[];
		onAddSelected?: (puzzles: PuzzleDefinition[]) => void;
	};

	let { catalog, addedPuzzleIds = [], onAddSelected = () => {} }: Props = $props();

	let filterText = $state('');
	let selectedPuzzleIds = $state<string[]>([]);

	const normalizedFilter = $derived.by(() => filterText.trim().toLowerCase());

	const visibleCatalog = $derived.by(() => {
		if (!normalizedFilter) {
			return catalog;
		}

		return catalog.filter((puzzle) => {
			const searchable = [
				puzzle.title,
				puzzle.description ?? '',
				puzzle.canonicalUrl,
				puzzle.tags.join(' ')
			]
				.join(' ')
				.toLowerCase();

			return searchable.includes(normalizedFilter);
		});
	});

	const selectedAddableCount = $derived.by(() => {
		const added = new Set(addedPuzzleIds);
		return selectedPuzzleIds.filter((id) => !added.has(id)).length;
	});

	function isAdded(puzzleId: string) {
		return addedPuzzleIds.includes(puzzleId);
	}

	function isSelected(puzzleId: string) {
		return selectedPuzzleIds.includes(puzzleId);
	}

	function updateSelection(puzzleId: string, event: Event) {
		if (isAdded(puzzleId)) {
			selectedPuzzleIds = selectedPuzzleIds.filter((id) => id !== puzzleId);
			return;
		}

		const checked = (event.target as HTMLInputElement).checked;

		if (checked && !selectedPuzzleIds.includes(puzzleId)) {
			selectedPuzzleIds = [...selectedPuzzleIds, puzzleId];
			return;
		}

		if (!checked) {
			selectedPuzzleIds = selectedPuzzleIds.filter((id) => id !== puzzleId);
		}
	}

	function addSelectedPuzzles() {
		const selected = catalog.filter(
			(puzzle) => selectedPuzzleIds.includes(puzzle.id) && !isAdded(puzzle.id)
		);

		if (!selected.length) {
			return;
		}

		onAddSelected(selected);
		selectedPuzzleIds = [];
	}
</script>

<Card>
	<h2>Browse Puzzle Catalog</h2>
	<p>Select puzzles and add them to your feed.</p>

	<Form layout="above" fullWidth>
		<FormItem fullWidth>
			{#snippet label()}Filter{/snippet}
			<Input bind:value={filterText} placeholder="Search title, tags, URL..." />
		</FormItem>
	</Form>

	<GridLayout>
		{#each visibleCatalog as puzzle (puzzle.id)}
			<Tile
				selectable
				checked={isSelected(puzzle.id)}
				onchange={(event) => updateSelection(puzzle.id, event)}
			>
				<div class="tile-content">
					<h3>{puzzle.title}</h3>
					<p>{puzzle.description ?? 'No description yet.'}</p>
					<div class="tag-row">
						{#each puzzle.tags as tag (tag)}
							<Tag>{tag}</Tag>
						{/each}
					</div>
					<div class="tag-row">
						{#if puzzle.archive.enabled}
							<Tag info>archive</Tag>
						{/if}
						{#if puzzle.unlimited.enabled}
							<Tag success>unlimited</Tag>
						{/if}
						{#if isAdded(puzzle.id)}
							<Tag primary>in feed</Tag>
						{/if}
					</div>
				</div>
			</Tile>
		{/each}
	</GridLayout>

	<div class="actions">
		<Button primary onclick={addSelectedPuzzles} disabled={selectedAddableCount === 0}>
			Add Selected ({selectedAddableCount})
		</Button>
	</div>
</Card>

<style>
	h2,
	h3,
	p {
		margin: 0;
	}

	.tile-content {
		display: grid;
		gap: 0.5rem;
		padding-top: 1rem;
		text-align: left;
		width: 100%;
	}

	.tag-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.actions {
		margin-top: 1rem;
	}

	:global(.grid-layout) {
		justify-content: start;
		place-content: start;
	}

	:global(.grid-layout .tile) {
		--tile-width: min(22rem, 100%);
	}
</style>
