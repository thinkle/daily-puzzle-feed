<script lang="ts">
	import { Button, Card, Tag, Tile } from 'contain-css-svelte';
	import { getPuzzleDisplayImageUrl, PUZZLE_TAG_LABELS, type PuzzleDefinition, type PuzzleSubmission } from '$lib/model/puzzle';

	type Props = {
		submissions: PuzzleSubmission[];
		isBusy?: boolean;
		onApprove?: (submission: PuzzleSubmission) => void | Promise<void>;
		onReject?: (submission: PuzzleSubmission) => void | Promise<void>;
	};

	let { submissions, isBusy = false, onApprove = () => {}, onReject = () => {} }: Props = $props();

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
							<Button primary disabled={isBusy} onclick={() => onApprove(submission)}>Approve</Button>
							<Button secondary disabled={isBusy} onclick={() => onReject(submission)}>Reject</Button>
						</div>
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

	.url {
		word-break: break-all;
	}

	.meta {
		color: var(--secondary-fg, var(--fg));
		font-size: 0.9em;
	}
</style>
