<script lang="ts">
	import { Button, Card, Checkbox, Form, FormItem, Input } from 'contain-css-svelte';
	import {
		createUserPuzzleDefinition,
		type PuzzleDefinition,
		type PuzzleDraftInput
	} from '$lib/model/puzzle';

	type Props = {
		onSubmitPuzzle?: (puzzle: PuzzleDefinition) => void;
	};

	let { onSubmitPuzzle = () => {} }: Props = $props();

	let title = $state('');
	let canonicalUrl = $state('');
	let description = $state('');
	let tags = $state('');

	let archiveEnabled = $state(false);
	let archiveUrl = $state('');
	let archiveUrlTemplate = $state('');

	let unlimitedEnabled = $state(false);
	let unlimitedUrl = $state('');
	let unlimitedUrlTemplate = $state('');

	let errorMessage = $state('');
	let submitted = $state(false);

	function resetForm() {
		title = '';
		canonicalUrl = '';
		description = '';
		tags = '';
		archiveEnabled = false;
		archiveUrl = '';
		archiveUrlTemplate = '';
		unlimitedEnabled = false;
		unlimitedUrl = '';
		unlimitedUrlTemplate = '';
	}

	function submitPuzzle(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		submitted = false;

		if (!title.trim()) {
			errorMessage = 'Title is required.';
			return;
		}

		if (!canonicalUrl.trim()) {
			errorMessage = 'Puzzle URL is required.';
			return;
		}

		try {
			new URL(canonicalUrl.trim());
		} catch {
			errorMessage = 'Puzzle URL must be a valid absolute URL.';
			return;
		}

		const draft: PuzzleDraftInput = {
			title,
			canonicalUrl,
			description,
			tags,
			archiveEnabled,
			archiveUrl,
			archiveUrlTemplate,
			unlimitedEnabled,
			unlimitedUrl,
			unlimitedUrlTemplate
		};

		const puzzle = createUserPuzzleDefinition(draft);
		onSubmitPuzzle(puzzle);
		resetForm();
		submitted = true;
	}
</script>

<Card>
	<h2>Submit Custom Puzzle</h2>
	<p>Add a new puzzle that is not in the seed catalog.</p>

	<Form fullWidth layout="above" onsubmit={submitPuzzle}>
		<FormItem fullWidth>
			{#snippet label()}Puzzle Title{/snippet}
			<Input bind:value={title} placeholder="Daily Puzzle Name" />
		</FormItem>

		<FormItem fullWidth>
			{#snippet label()}Puzzle URL{/snippet}
			<Input bind:value={canonicalUrl} type="url" placeholder="https://example.com/puzzle" />
		</FormItem>

		<FormItem fullWidth>
			{#snippet label()}Description{/snippet}
			<Input bind:value={description} placeholder="Short description (optional)" />
		</FormItem>

		<FormItem fullWidth>
			{#snippet label()}Tags{/snippet}
			<Input bind:value={tags} placeholder="word, geography, trivia" />
		</FormItem>

		<FormItem fullWidth>
			{#snippet label()}Archive Mode{/snippet}
			<Checkbox bind:checked={archiveEnabled}>Has archive mode</Checkbox>
		</FormItem>

		{#if archiveEnabled}
			<FormItem fullWidth>
				{#snippet label()}Archive URL{/snippet}
				<Input bind:value={archiveUrl} type="url" placeholder="https://example.com/archive" />
			</FormItem>
			<FormItem fullWidth>
				{#snippet label()}Archive URL Template{/snippet}
				<Input
					bind:value={archiveUrlTemplate}
					placeholder="https://example.com/archive/YYYY-MM-DD"
				/>
			</FormItem>
		{/if}

		<FormItem fullWidth>
			{#snippet label()}Unlimited Mode{/snippet}
			<Checkbox bind:checked={unlimitedEnabled}>Has unlimited mode</Checkbox>
		</FormItem>

		{#if unlimitedEnabled}
			<FormItem fullWidth>
				{#snippet label()}Unlimited URL{/snippet}
				<Input bind:value={unlimitedUrl} type="url" placeholder="https://example.com/unlimited" />
			</FormItem>
			<FormItem fullWidth>
				{#snippet label()}Unlimited URL Template{/snippet}
				<Input
					bind:value={unlimitedUrlTemplate}
					placeholder="https://example.com/unlimited/seed-or-date"
				/>
			</FormItem>
		{/if}

		<FormItem fullWidth>
			{#snippet label()}&nbsp;{/snippet}
			<Button primary type="submit">Save Puzzle</Button>
		</FormItem>
	</Form>

	{#if errorMessage}
		<p class="error">{errorMessage}</p>
	{/if}
	{#if submitted}
		<p class="ok">Puzzle added and selected for your feed.</p>
	{/if}
</Card>

<style>
	h2,
	p {
		margin: 0;
	}

	.error {
		color: var(--error-fg, #b30000);
	}

	.ok {
		color: var(--success-fg, #147d2f);
	}
</style>
