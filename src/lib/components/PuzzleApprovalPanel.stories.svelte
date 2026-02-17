<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import PuzzleApprovalPanel from './PuzzleApprovalPanel.svelte';
	import type { PuzzleSubmission } from '$lib/model/puzzle';

	const sampleSubmissions: PuzzleSubmission[] = [
		{
			id: 'submission-wordle',
			status: 'pending',
			title: 'Wordle',
			canonicalUrl: 'https://www.nytimes.com/games/wordle/index.html',
			canonicalUrlNormalized: 'https://www.nytimes.com/games/wordle',
			description: 'Guess the hidden word in 6 tries.',
			tags: ['word_games', 'wordle_like'],
			siteName: 'NYT Games',
			image: {
				mode: 'auto',
				previewUrl: 'https://www.nytimes.com/games-assets/v2/assets/wordle/wordle_og_1200x630.png'
			},
			archive: { enabled: false },
			unlimited: { enabled: false },
			resolveSource: 'metadata_endpoint',
			submittedBy: {
				uid: 'uid-1',
				email: 'user@example.com',
				displayName: 'Sample User'
			},
			createdAtMs: Date.now() - 1000 * 60 * 10
		},
		{
			id: 'submission-framed',
			status: 'pending',
			title: 'Framed',
			canonicalUrl: 'https://framed.wtf',
			canonicalUrlNormalized: 'https://framed.wtf',
			description: 'Guess the movie from a still frame.',
			tags: ['film', 'history'],
			archive: {
				enabled: true,
				url: 'https://framed.wtf/archive'
			},
			unlimited: { enabled: false },
			resolveSource: 'fallback',
			submittedBy: {
				uid: 'uid-2',
				email: 'another@example.com',
				displayName: 'Another User'
			},
			createdAtMs: Date.now() - 1000 * 60 * 60
		}
	];

	const { Story } = defineMeta({
		title: 'App/PuzzleApprovalPanel',
		component: PuzzleApprovalPanel,
		tags: ['autodocs'],
		args: {
			submissions: sampleSubmissions,
			isBusy: false,
			onApprove: fn(),
			onReject: fn()
		}
	});
</script>

<Story name="Default" />
<Story name="Busy" args={{ isBusy: true }} />
<Story name="Empty" args={{ submissions: [] }} />
