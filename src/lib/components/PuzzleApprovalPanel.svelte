<script lang="ts">
	import { Button, Card, Checkbox, Form, FormItem, Input, Tag, Tile } from 'contain-css-svelte';
	import {
		getPuzzleDisplayImageUrl,
		PUZZLE_TAG_LABELS,
		PUZZLE_TAG_OPTIONS,
		type PuzzleDefinition,
		type PuzzleSubmission,
		type PuzzleTag
	} from '$lib/model/puzzle';

	type Props = {
		submissions: PuzzleSubmission[];
		isBusy?: boolean;
		onApprove?: (submission: PuzzleSubmission) => void | Promise<void>;
		onReject?: (submission: PuzzleSubmission) => void | Promise<void>;
		onSaveEdit?: (
			submission: PuzzleSubmission,
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
		submissions,
		isBusy = false,
		onApprove = () => {},
		onReject = () => {},
		onSaveEdit = () => {}
	}: Props = $props();

	let editingId = $state<string | null>(null);
	let editTitle = $state('');
	let editCanonicalUrl = $state('');
	let editDescription = $state('');
	let editSiteName = $state('');
	let editTags = $state<PuzzleTag[]>([]);

	function startEdit(submission: PuzzleSubmission) {
		editingId = submission.id;
		editTitle = submission.title;
		editCanonicalUrl = submission.canonicalUrl;
		editDescription = submission.description ?? '';
		editSiteName = submission.siteName ?? '';
		editTags = [...submission.tags];
	}

	function cancelEdit() {
		editingId = null;
	}

	function toggleTag(tag: PuzzleTag, checked: boolean) {
		if (checked && !editTags.includes(tag)) {
			editTags = [...editTags, tag];
			return;
		}

		if (!checked) {
			editTags = editTags.filter((existingTag) => existingTag !== tag);
		}
	}

	async function saveEdit(submission: PuzzleSubmission) {
		await onSaveEdit(submission, {
			title: editTitle,
			canonicalUrl: editCanonicalUrl,
			description: editDescription,
			tags: editTags,
			siteName: editSiteName
		});
		editingId = null;
	}

	function asPuzzle(submission: PuzzleSubmission): PuzzleDefinition {
		return {
			id: submission.id,
			title: submission.title,
			canonicalUrl: submission.canonicalUrl,
			canonicalUrlNormalized: submission.canonicalUrlNormalized,
			description: submission.description,
			tags: submission.tags,
			archive: submission.archive,
			unlimited: submission.unlimited,
			image: submission.image,
			siteName: submission.siteName,
			active: true,
			source: 'user'
		};
	}

	function formatWhen(timestampMs?: number) {
		if (!timestampMs) {
			return 'Unknown date';
		}

		try {
			return new Date(timestampMs).toLocaleString();
		} catch {
			return 'Unknown date';
		}
	}
</script>

<Card>
	<h2>Admin Review Queue</h2>
	<p>Approve or reject submitted puzzles.</p>

	{#if submissions.length === 0}
		<p>No pending submissions.</p>
	{:else}
		<div class="queue-list">
			{#each submissions as submission (submission.id)}
				<Tile>
					<div class="submission-content">
						{#if getPuzzleDisplayImageUrl(asPuzzle(submission))}
							<img
								class="puzzle-image"
								src={getPuzzleDisplayImageUrl(asPuzzle(submission))}
								alt={`${submission.title} preview`}
							/>
						{/if}
						{#if editingId === submission.id}
							<Form fullWidth layout="above">
								<FormItem fullWidth>
									{#snippet label()}Title{/snippet}
									<Input bind:value={editTitle} />
								</FormItem>
								<FormItem fullWidth>
									{#snippet label()}Canonical URL{/snippet}
									<Input bind:value={editCanonicalUrl} />
								</FormItem>
								<FormItem fullWidth>
									{#snippet label()}Description{/snippet}
									<Input bind:value={editDescription} />
								</FormItem>
								<FormItem fullWidth>
									{#snippet label()}Site Name{/snippet}
									<Input bind:value={editSiteName} />
								</FormItem>
								<FormItem fullWidth>
									{#snippet label()}Tags{/snippet}
									<div class="tag-grid">
										{#each PUZZLE_TAG_OPTIONS as tag}
											<Checkbox
												checked={editTags.includes(tag)}
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
								<Button primary disabled={isBusy} onclick={() => saveEdit(submission)}>Save</Button>
								<Button disabled={isBusy} onclick={cancelEdit}>Cancel</Button>
							</div>
						{:else}
							<h3>{submission.title}</h3>
							<p class="url">{submission.canonicalUrl}</p>
							<p>{submission.description ?? 'No description provided.'}</p>
							<p class="meta">Submitted {formatWhen(submission.createdAtMs)}</p>
							<div class="tag-row">
								{#each submission.tags as tag (tag)}
									<Tag>{PUZZLE_TAG_LABELS[tag]}</Tag>
								{/each}
							</div>
							<div class="actions">
								<Button disabled={isBusy} onclick={() => startEdit(submission)}>Edit</Button>
								<Button primary disabled={isBusy} onclick={() => onApprove(submission)}>Approve</Button>
								<Button secondary disabled={isBusy} onclick={() => onReject(submission)}>Reject</Button>
							</div>
						{/if}
					</div>
				</Tile>
			{/each}
		</div>
	{/if}
</Card>

<style>
	h2,
	h3,
	p {
		margin: 0;
	}

	.queue-list {
		display: grid;
		gap: 0.75rem;
	}

	.submission-content {
		display: grid;
		gap: 0.45rem;
		text-align: left;
		width: 100%;
	}

	.puzzle-image {
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius, 8px);
		height: 8rem;
		object-fit: cover;
		width: 100%;
	}

	.tag-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.tag-grid {
		display: grid;
		gap: 0.35rem;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
	}

	.url {
		word-break: break-all;
	}

	.meta {
		color: var(--secondary-fg, var(--fg));
		font-size: 0.9em;
	}
</style>
