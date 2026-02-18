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
			siteName
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
	</Form>
	<div class="actions">
		<Button primary disabled={isBusy} onclick={handleSave}>Save</Button>
		<Button disabled={isBusy} onclick={onCancel}>Cancel</Button>
	</div>
</div>

<style>
	.edit-form {
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius, 8px);
		padding: 1rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.5rem;
	}

	.tag-grid {
		display: grid;
		gap: 0.35rem;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
	}
</style>
