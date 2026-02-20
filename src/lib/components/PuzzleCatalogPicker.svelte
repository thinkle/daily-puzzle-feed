<script lang="ts">
	import { Button, Container, Form, FormItem, GridLayout, Input } from 'contain-css-svelte';
	import {
		PUZZLE_TAG_LABELS,
		PUZZLE_TAG_OPTIONS,
		type PuzzleDefinition,
		type PuzzleTag
	} from '$lib/model/puzzle';
	import PuzzleCard from './PuzzleCard.svelte';
	import PuzzleEditForm from './PuzzleEditForm.svelte';

	type Props = {
		catalog: PuzzleDefinition[];
		addedPuzzleIds?: string[];
		isAdmin?: boolean;
		onAdd?: (puzzle: PuzzleDefinition) => void;
		onEditPuzzle?: (
			puzzle: PuzzleDefinition,
			update: {
				title: string;
				canonicalUrl: string;
				description?: string;
				tags: PuzzleTag[];
				siteName?: string;
			}
		) => void | Promise<void>;
	};

	let {
		catalog,
		addedPuzzleIds = [],
		isAdmin = false,
		onAdd = () => {},
		onEditPuzzle = () => {}
	}: Props = $props();

	let filterText = $state('');
	let selectedTags = $state<PuzzleTag[]>([]);
	let editingId = $state<string | null>(null);
	let isEditBusy = $state(false);

	const normalizedFilter = $derived.by(() => filterText.trim().toLowerCase());
	const hasSelectedTags = $derived.by(() => selectedTags.length > 0);

	const visibleCatalog = $derived.by(() => {
		return catalog.filter((puzzle) => {
			const tagMatch = hasSelectedTags ? puzzle.tags.some((tag) => selectedTags.includes(tag)) : true;
			if (!tagMatch) {
				return false;
			}

			if (!normalizedFilter) {
				return true;
			}

			const searchable = [puzzle.title, puzzle.description ?? '', puzzle.canonicalUrl, puzzle.tags.join(' ')]
				.join(' ')
				.toLowerCase();

			return searchable.includes(normalizedFilter);
		});
	});

	function isAdded(puzzleId: string) {
		return addedPuzzleIds.includes(puzzleId);
	}

	function isTagSelected(tag: PuzzleTag) {
		return selectedTags.includes(tag);
	}

	function toggleTag(tag: PuzzleTag) {
		if (selectedTags.includes(tag)) {
			selectedTags = selectedTags.filter((existing) => existing !== tag);
			return;
		}

		selectedTags = [...selectedTags, tag];
	}

	function clearTagFilter() {
		selectedTags = [];
	}

	async function handleSaveEdit(
		puzzle: PuzzleDefinition,
		update: {
			title: string;
			canonicalUrl: string;
			description?: string;
			tags: PuzzleTag[];
			siteName?: string;
		}
	) {
		isEditBusy = true;
		try {
			await onEditPuzzle(puzzle, update);
			editingId = null;
		} finally {
			isEditBusy = false;
		}
	}
</script>

<div class="puzzle-catalog-picker">
	<Container maxWidth="1800px" bg="var(--container-bg)" fg="var(--container-fg)">
		<h2>Browse Puzzle Catalog</h2>
		<p>Select puzzles and add them to your feed.</p>

		<Form layout="above" fullWidth>
			<FormItem fullWidth>
				{#snippet label()}Filter{/snippet}
				<Input bind:value={filterText} placeholder="Search title, tags, URL..." />
			</FormItem>
			<FormItem fullWidth>
				{#snippet label()}Categories{/snippet}
				<div class="tag-filter-row">
					<Button
						primary={!hasSelectedTags}
						secondary={hasSelectedTags}
						aria-pressed={!hasSelectedTags}
						onclick={clearTagFilter}
					>
						All
					</Button>
					{#each PUZZLE_TAG_OPTIONS as tag (tag)}
						<Button
							primary={isTagSelected(tag)}
							secondary={!isTagSelected(tag)}
							aria-pressed={isTagSelected(tag)}
							onclick={() => toggleTag(tag)}
						>
							{PUZZLE_TAG_LABELS[tag]}
						</Button>
					{/each}
				</div>
			</FormItem>
		</Form>

		{#if visibleCatalog.length === 0}
			<p class="empty-results">No puzzles match your current filters.</p>
		{:else}
			<GridLayout --item-width="var(--grid-width)" --tag-font-size="0.7em">
				{#each visibleCatalog as puzzle (puzzle.id)}
					{#if editingId === puzzle.id}
						<PuzzleEditForm
							initial={puzzle}
							isBusy={isEditBusy}
							onSave={(update) => handleSaveEdit(puzzle, update)}
							onCancel={() => (editingId = null)}
						/>
					{:else}
						<PuzzleCard {puzzle} descriptionMode="always">
							{#snippet actions()}
								{#if isAdmin}
									<Button onclick={() => (editingId = puzzle.id)}>Edit</Button>
								{/if}
								{#if isAdded(puzzle.id)}
									<Button disabled>Added</Button>
								{:else}
									<Button primary onclick={() => onAdd(puzzle)}>Add</Button>
								{/if}
							{/snippet}
						</PuzzleCard>
					{/if}
				{/each}
			</GridLayout>
		{/if}
	</Container>
</div>

<style>
	.puzzle-catalog-picker {
		display: contents;
		--grid-width: var(--card-width);
	}

	.tag-filter-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space);
		--button-margin: 0;
		--button-padding: 0.2rem 0.55rem;
		--button-border-radius: 999px;
	}

	@media (max-width: 600px) {
		.puzzle-catalog-picker {
			--grid-width: var(--card-width-small);
			--card-margin: 0;
		}
	}
	h2,
	p {
		margin: 0;
	}

	.empty-results {
		color: var(--secondary-fg, var(--fg));
	}
</style>
