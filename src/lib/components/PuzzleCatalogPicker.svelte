<script lang="ts">
	import { Button, Container, Form, FormItem, GridLayout, Input } from 'contain-css-svelte';
	import {
		PUZZLE_TAG_LABELS,
		PUZZLE_TAG_OPTIONS,
		type PuzzleDefinition,
		type PuzzleTag
	} from '$lib/model/puzzle';
	import PuzzleCard from './PuzzleCard.svelte';
	import PuzzleCatalogRow from './PuzzleCatalogRow.svelte';
	import PuzzleEditForm from './PuzzleEditForm.svelte';

	type SortMode = 'popularity' | 'alphabetical';

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
				ranking?: number;
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
	let sortMode = $state<SortMode>('popularity');

	const normalizedFilter = $derived.by(() => filterText.trim().toLowerCase());
	const hasSelectedTags = $derived.by(() => selectedTags.length > 0);
	const addedSet = $derived(new Set(addedPuzzleIds));

	function filterRelevance(puzzle: PuzzleDefinition, query: string): number {
		if (!query) return 0;
		const title = puzzle.title.toLowerCase();
		if (title === query) return 3;
		if (title.startsWith(query)) return 2;
		if (title.includes(query)) return 1;
		return 0;
	}

	function sortPuzzles(puzzles: PuzzleDefinition[], mode: SortMode, query: string): PuzzleDefinition[] {
		const notAdded = puzzles.filter((p) => !addedSet.has(p.id));
		const added = puzzles.filter((p) => addedSet.has(p.id));

		const baseSorter =
			mode === 'popularity'
				? (a: PuzzleDefinition, b: PuzzleDefinition) => {
						const rankDiff = (b.ranking ?? 0) - (a.ranking ?? 0);
						return rankDiff !== 0 ? rankDiff : a.title.localeCompare(b.title);
					}
				: (a: PuzzleDefinition, b: PuzzleDefinition) => a.title.localeCompare(b.title);

		const sorter = query
			? (a: PuzzleDefinition, b: PuzzleDefinition) => {
					const relevanceDiff = filterRelevance(b, query) - filterRelevance(a, query);
					return relevanceDiff !== 0 ? relevanceDiff : baseSorter(a, b);
				}
			: baseSorter;

		return [...notAdded.sort(sorter), ...added.sort(sorter)];
	}

	const filteredCatalog = $derived.by(() => {
		return catalog.filter((puzzle) => {
			const tagMatch = hasSelectedTags
				? puzzle.tags.some((tag) => selectedTags.includes(tag))
				: true;
			if (!tagMatch) {
				return false;
			}

			if (!normalizedFilter) {
				return true;
			}

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

	const sortedCatalog = $derived(sortPuzzles(filteredCatalog, sortMode, normalizedFilter));

	function isAdded(puzzleId: string) {
		return addedSet.has(puzzleId);
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
			ranking?: number;
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

		<div class="sort-row">
			<span class="sort-label">Sort:</span>
			<Button
				primary={sortMode === 'popularity'}
				secondary={sortMode !== 'popularity'}
				--button-padding="var(--space) var(--space-md)"
				--button-border-radius="999px"
				--button-margin="0"
				onclick={() => (sortMode = 'popularity')}
			>
				Popularity
			</Button>
			<Button
				primary={sortMode === 'alphabetical'}
				secondary={sortMode !== 'alphabetical'}
				--button-padding="var(--space) var(--space-md)"
				--button-border-radius="999px"
				--button-margin="0"
				onclick={() => (sortMode = 'alphabetical')}
			>
				A-Z
			</Button>
		</div>

		{#if sortedCatalog.length === 0}
			<p class="empty-results">No puzzles match your current filters.</p>
		{:else}
			<!-- Desktop: card grid -->
			<div class="desktop-view">
				<GridLayout --item-width="var(--grid-width)" --tag-font-size="0.7em">
					{#each sortedCatalog as puzzle (puzzle.id)}
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
			</div>

			<!-- Mobile: compact list -->
			<div class="mobile-view">
				<ul class="catalog-list">
					{#each sortedCatalog as puzzle (puzzle.id)}
						{#if editingId === puzzle.id}
							<li class="catalog-row-edit">
								<PuzzleEditForm
									initial={puzzle}
									isBusy={isEditBusy}
									onSave={(update) => handleSaveEdit(puzzle, update)}
									onCancel={() => (editingId = null)}
								/>
							</li>
						{:else}
							<PuzzleCatalogRow
								{puzzle}
								isAdded={isAdded(puzzle.id)}
								{isAdmin}
								onAdd={(p) => onAdd(p)}
								onEdit={(p) => (editingId = p.id)}
							/>
						{/if}
					{/each}
				</ul>
			</div>
		{/if}
	</Container>
</div>

<style>
	.puzzle-catalog-picker {
		display: contents;
		--grid-width: var(--card-width-small);
	}

	.tag-filter-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space);
		--button-margin: 0;
		--button-padding: var(--space) var(--space-md);
		--button-border-radius: 999px;
	}

	.sort-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.sort-label {
		font-size: 0.85em;
		color: var(--secondary-fg, var(--fg));
	}

	.catalog-list {
		list-style: none;
		margin: 0;
		padding: 0;
		border: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
		border-radius: var(--border-radius);
		overflow: hidden;
	}

	.catalog-row-edit {
		list-style: none;
		padding: var(--space-md);
		border-bottom: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
	}

	/* Desktop: show cards, hide list */
	.mobile-view {
		display: none;
	}

	@media (max-width: 1000px) {
		.desktop-view {
			display: none;
		}
		.mobile-view {
			display: block;
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
