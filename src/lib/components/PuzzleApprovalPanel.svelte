<script lang="ts">
	import { Button, DataList, DataListItem, Tag } from 'contain-css-svelte';
	import {
		getPuzzleDisplayImageUrl,
		PUZZLE_TAG_LABELS,
		type PuzzleSubmission,
		type PuzzleTag
	} from '$lib/model/puzzle';
	import PuzzleEditForm from './PuzzleEditForm.svelte';

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

	async function handleSaveEdit(
		submission: PuzzleSubmission,
		update: {
			title: string;
			canonicalUrl: string;
			description?: string;
			tags: PuzzleTag[];
			siteName?: string;
		}
	) {
		await onSaveEdit(submission, update);
		editingId = null;
	}
</script>

<section class="admin-review-queue">
	<h2>Admin Review Queue</h2>
	<p>Approve or reject submitted puzzles.</p>

	{#if submissions.length === 0}
		<p>No pending submissions.</p>
	{:else}
		<DataList
			stackable
			iconSize="3rem"
			iconBorderRadius="var(--border-radius)"
		>
			{#each submissions as submission (submission.id)}
				{#if editingId === submission.id}
					<DataListItem itemMinHeight="auto">
						<PuzzleEditForm
							initial={submission}
							{isBusy}
							onSave={(update) => handleSaveEdit(submission, update)}
							onCancel={() => (editingId = null)}
						/>
					</DataListItem>
				{:else}
					{@const imageUrl = getPuzzleDisplayImageUrl(submission)}
					<DataListItem>
						{#snippet start()}
							{#if imageUrl}
								<img src={imageUrl} alt="" />
							{/if}
						{/snippet}
						<h4 class="submission-title">{submission.title}</h4>
						{#if submission.description}
							<p class="submission-description">{submission.description}</p>
						{/if}
						{#if submission.tags.length > 0}
							<div class="tag-row">
								{#each submission.tags as tag (tag)}
									<Tag --tag-font-size="0.75em">{PUZZLE_TAG_LABELS[tag] ?? tag}</Tag>
								{/each}
							</div>
						{/if}
						{#if submission.submittedBy?.displayName || submission.submittedBy?.email}
							<span class="submitted-by">
								by {submission.submittedBy.displayName ?? submission.submittedBy.email}
							</span>
						{/if}
						{#snippet end()}
							<Button disabled={isBusy} onclick={() => (editingId = submission.id)}>Edit</Button>
							<Button primary disabled={isBusy} onclick={() => onApprove(submission)}>Approve</Button>
							<Button secondary disabled={isBusy} onclick={() => onReject(submission)}>Reject</Button>
						{/snippet}
					</DataListItem>
				{/if}
			{/each}
		</DataList>
	{/if}
</section>

<style>
	h2,
	p {
		margin: 0;
	}

	.admin-review-queue {
		display: grid;
		gap: 0.5rem;
	}

	.submission-title {
		margin: 0;
	}

	.submission-description {
		font-size: 0.9em;
		color: var(--secondary-fg, var(--fg));
	}

	.tag-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.submitted-by {
		font-size: 0.8em;
		color: var(--secondary-fg, var(--fg));
		font-style: italic;
	}
</style>
