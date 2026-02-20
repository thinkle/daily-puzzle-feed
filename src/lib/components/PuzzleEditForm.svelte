<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, Checkbox, Form, FormItem, Input } from 'contain-css-svelte';
	import {
		PUZZLE_TAG_LABELS,
		PUZZLE_TAG_OPTIONS,
		type PuzzleTag
	} from '$lib/model/puzzle';

	type PuzzleFields = {
		title: string;
		canonicalUrl: string;
		description?: string;
		tags: PuzzleTag[];
		siteName?: string;
		ranking?: number;
	};

	type Props = {
		initial: PuzzleFields;
		isBusy?: boolean;
		onSave: (update: PuzzleFields) => void | Promise<void>;
		onCancel: () => void;
	};

	let { initial, isBusy = false, onSave, onCancel }: Props = $props();

	let title = $state(untrack(() => initial.title));
	let canonicalUrl = $state(untrack(() => initial.canonicalUrl));
	let description = $state(untrack(() => initial.description ?? ''));
	let siteName = $state(untrack(() => initial.siteName ?? ''));
	let tags = $state<PuzzleTag[]>(untrack(() => [...initial.tags]));
	let rankingStr = $state(untrack(() => String(initial.ranking ?? 0)));

	function toggleTag(tag: PuzzleTag, checked: boolean) {
		if (checked && !tags.includes(tag)) {
			tags = [...tags, tag];
			return;
		}

		if (!checked) {
			tags = tags.filter((t) => t !== tag);
		}
	}

	async function handleSave() {
		await onSave({
			title,
			canonicalUrl,
			description,
			tags,
			siteName,
			ranking: Number.parseInt(rankingStr, 10) || 0
		});
	}
</script>

<div class="edit-form">
	<Form fullWidth layout="above">
		<FormItem fullWidth>
			{#snippet label()}Title{/snippet}
			<Input bind:value={title} />
		</FormItem>
		<FormItem fullWidth>
			{#snippet label()}Canonical URL{/snippet}
			<Input bind:value={canonicalUrl} />
		</FormItem>
		<FormItem fullWidth>
			{#snippet label()}Description{/snippet}
			<Input bind:value={description} />
		</FormItem>
		<FormItem fullWidth>
			{#snippet label()}Site Name{/snippet}
			<Input bind:value={siteName} />
		</FormItem>
		<FormItem fullWidth>
			{#snippet label()}Tags{/snippet}
			<div class="tag-grid">
				{#each PUZZLE_TAG_OPTIONS as tag}
					<Checkbox
						checked={tags.includes(tag)}
						onchange={(event) =>
							toggleTag(tag, (event.currentTarget as HTMLInputElement).checked)}
					>
						{PUZZLE_TAG_LABELS[tag]}
					</Checkbox>
				{/each}
			</div>
		</FormItem>
		<FormItem>
			{#snippet label()}Ranking (higher = more prominent){/snippet}
			<Input type="number" bind:value={rankingStr} min="0" --input-width="8rem" />
		</FormItem>
	</Form>
	<div class="actions">
		<Button primary disabled={isBusy} onclick={handleSave}>Save</Button>
		<Button disabled={isBusy} onclick={onCancel}>Cancel</Button>
	</div>
</div>

<style>
	.edit-form {
		border: var(--border-width, 1px) var(--border-style, solid) var(--border-color);
		border-radius: var(--border-radius);
		padding: var(--padding);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
		margin-top: var(--space-lg);
	}

	.tag-grid {
		display: grid;
		gap: var(--space-md);
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
	}
</style>
