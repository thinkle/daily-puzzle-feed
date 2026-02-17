<script lang="ts">
	import { Button, Card, Checkbox, Form, FormItem, Input } from 'contain-css-svelte';
	import {
		createUserPuzzleDefinition,
		type PuzzleDefinition,
		type PuzzleDraftInput
	} from '$lib/model/puzzle';
	import type { PuzzleUrlResolution } from '$lib/data/puzzle-resolver';

	type Props = {
		onSubmitPuzzle?: (
			puzzle: PuzzleDefinition,
			context: {
				draft: PuzzleDraftInput;
				resolveSource: 'metadata_endpoint' | 'fallback' | 'manual';
				metadata: Record<string, unknown> | null;
			}
		) => void | Promise<void>;
		onResolveUrl?: (url: string) => Promise<PuzzleUrlResolution>;
		onAddExistingPuzzle?: (puzzle: PuzzleDefinition) => void | Promise<void>;
	};

	let { onSubmitPuzzle = () => {}, onResolveUrl, onAddExistingPuzzle = () => {} }: Props = $props();

	let title = $state('');
	let canonicalUrl = $state('');
	let description = $state('');
	let tags = $state('');
	let siteName = $state('');
	let imageCustomUrl = $state('');
	let imagePreviewUrl = $state('');
	let imageFaviconUrl = $state('');
	let resolveSource = $state<'metadata_endpoint' | 'fallback' | 'manual'>('manual');
	let resolveMetadata = $state<Record<string, unknown> | null>(null);

	let archiveEnabled = $state(false);
	let archiveUrl = $state('');
	let archiveUrlTemplate = $state('');

	let unlimitedEnabled = $state(false);
	let unlimitedUrl = $state('');
	let unlimitedUrlTemplate = $state('');

	let errorMessage = $state('');
	let submitted = $state(false);
	let resolveMessage = $state('');
	let isResolving = $state(false);
	let isSubmitting = $state(false);

	const imagePreview = $derived(
		imageCustomUrl.trim() || imagePreviewUrl.trim() || imageFaviconUrl.trim()
	);

	function resetForm() {
		title = '';
		canonicalUrl = '';
		description = '';
		tags = '';
		siteName = '';
		imageCustomUrl = '';
		imagePreviewUrl = '';
		imageFaviconUrl = '';
		resolveSource = 'manual';
		resolveMetadata = null;
		archiveEnabled = false;
		archiveUrl = '';
		archiveUrlTemplate = '';
		unlimitedEnabled = false;
		unlimitedUrl = '';
		unlimitedUrlTemplate = '';
		resolveMessage = '';
	}

	function applyPrefill(prefill: PuzzleDraftInput) {
		title = prefill.title ?? '';
		canonicalUrl = prefill.canonicalUrl ?? canonicalUrl;
		description = prefill.description ?? '';
		tags = Array.isArray(prefill.tags) ? prefill.tags.join(', ') : (prefill.tags ?? '');
		siteName = prefill.siteName ?? '';
		imagePreviewUrl = prefill.imagePreviewUrl ?? '';
		imageCustomUrl = prefill.imageCustomUrl ?? prefill.imagePreviewUrl ?? '';
		imageFaviconUrl = prefill.imageFaviconUrl ?? '';
		archiveEnabled = Boolean(prefill.archiveEnabled);
		archiveUrl = prefill.archiveUrl ?? '';
		archiveUrlTemplate = prefill.archiveUrlTemplate ?? '';
		unlimitedEnabled = Boolean(prefill.unlimitedEnabled);
		unlimitedUrl = prefill.unlimitedUrl ?? '';
		unlimitedUrlTemplate = prefill.unlimitedUrlTemplate ?? '';
	}

	async function resolveUrl() {
		errorMessage = '';
		resolveMessage = '';
		submitted = false;

		if (!canonicalUrl.trim()) {
			errorMessage = 'Puzzle URL is required before lookup.';
			return;
		}

		if (!onResolveUrl) {
			resolveMessage = 'URL resolver is not configured for this environment.';
			return;
		}

		isResolving = true;
		try {
			const result = await onResolveUrl(canonicalUrl.trim());

			if (result.kind === 'existing') {
				await onAddExistingPuzzle(result.puzzle);
				resolveSource = 'manual';
				resolveMetadata = null;
				resolveMessage = 'This URL already exists. Added it to your feed.';
				return;
			}

			resolveSource = result.source;
			resolveMetadata = (result.metadata ?? null) as Record<string, unknown> | null;
			applyPrefill(result.prefill);
			resolveMessage =
				result.source === 'metadata_endpoint'
					? 'Metadata loaded. Review fields, then save.'
					: 'No remote metadata available. We prefilled what we could.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'URL lookup failed.';
		} finally {
			isResolving = false;
		}
	}

	async function submitPuzzle(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		submitted = false;
		resolveMessage = '';

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
			siteName,
			imageMode: imageCustomUrl.trim() ? 'url' : imagePreviewUrl.trim() ? 'auto' : undefined,
			imagePreviewUrl,
			imageCustomUrl,
			imageFaviconUrl,
			archiveEnabled,
			archiveUrl,
			archiveUrlTemplate,
			unlimitedEnabled,
			unlimitedUrl,
			unlimitedUrlTemplate
		};

		isSubmitting = true;
		try {
			const puzzle = createUserPuzzleDefinition(draft);
			await onSubmitPuzzle(puzzle, {
				draft,
				resolveSource,
				metadata: resolveMetadata
			});
			resetForm();
			submitted = true;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Could not save puzzle.';
		} finally {
			isSubmitting = false;
		}
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
			{#snippet label()}Lookup{/snippet}
			<Button type="button" onclick={resolveUrl} disabled={isResolving || !canonicalUrl.trim()}>
				{isResolving ? 'Looking up...' : 'Lookup URL Metadata'}
			</Button>
		</FormItem>

		<FormItem fullWidth>
			{#snippet label()}Description{/snippet}
			<Input bind:value={description} placeholder="Short description (optional)" />
		</FormItem>

		<FormItem fullWidth>
			{#snippet label()}Site Name{/snippet}
			<Input bind:value={siteName} placeholder="Optional source/site name" />
		</FormItem>

		<FormItem fullWidth>
			{#snippet label()}Image URL{/snippet}
			<Input bind:value={imageCustomUrl} type="url" placeholder="https://example.com/image.png" />
		</FormItem>

		{#if imagePreview}
			<FormItem fullWidth>
				{#snippet label()}Image Preview{/snippet}
				<div class="preview-wrap">
					<img src={imagePreview} alt="Puzzle preview" />
				</div>
			</FormItem>
		{/if}

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
			<Button primary type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Saving...' : 'Save Puzzle'}
			</Button>
		</FormItem>
	</Form>

	{#if errorMessage}
		<p class="error">{errorMessage}</p>
	{/if}
	{#if resolveMessage}
		<p class="hint">{resolveMessage}</p>
	{/if}
	{#if submitted}
		<p class="ok">Puzzle added to your feed and queued for review.</p>
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

	.hint {
		color: var(--info-fg, #0057ad);
	}

	.preview-wrap {
		display: grid;
		gap: 0.4rem;
	}

	.preview-wrap img {
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius, 8px);
		max-height: 10rem;
		max-width: 100%;
		object-fit: cover;
	}
</style>
