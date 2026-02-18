<script lang="ts">
	import { Button } from 'contain-css-svelte';
	import { type PuzzleSubmission, type PuzzleTag } from '$lib/model/puzzle';
	import PuzzleCard from './PuzzleCard.svelte';
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
		<div class="queue-list">
			{#each submissions as submission (submission.id)}
				{#if editingId === submission.id}
					<PuzzleEditForm
						initial={submission}
						{isBusy}
						onSave={(update) => handleSaveEdit(submission, update)}
						onCancel={() => (editingId = null)}
					/>
				{:else}
					<PuzzleCard puzzle={submission}>
						{#snippet actions()}
							<Button disabled={isBusy} onclick={() => (editingId = submission.id)}>Edit</Button>
							<Button primary disabled={isBusy} onclick={() => onApprove(submission)}
								>Approve</Button
							>
							<Button secondary disabled={isBusy} onclick={() => onReject(submission)}
								>Reject</Button
							>
						{/snippet}
					</PuzzleCard>
				{/if}
			{/each}
		</div>
	{/if}
</section>

<style>
	h2,
	p {
		margin: 0;
	}

	.queue-list {
		display: grid;
		gap: 0.75rem;
	}

	.admin-review-queue {
		display: grid;
		gap: 0.5rem;
	}
</style>
