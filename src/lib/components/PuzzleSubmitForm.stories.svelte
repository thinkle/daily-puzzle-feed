<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import PuzzleSubmitForm from './PuzzleSubmitForm.svelte';
	import type { PuzzleUrlResolution } from '$lib/data/puzzle-resolver';

	async function mockResolveUrl(url: string): Promise<PuzzleUrlResolution> {
		if (url.includes('wordle')) {
			return {
				kind: 'existing',
				source: 'local',
				puzzle: {
					id: 'nytimes-wordle',
					title: 'Wordle',
					canonicalUrl: 'https://www.nytimes.com/games/wordle/index.html',
					canonicalUrlNormalized: 'https://www.nytimes.com/games/wordle/index.html',
					description: 'Guess the five-letter word in six tries.',
					tags: ['word', 'daily'],
					archive: { enabled: false },
					unlimited: { enabled: false },
					active: true,
					source: 'seed'
				}
			};
		}

		return {
			kind: 'prefill',
			source: 'metadata_endpoint',
			metadata: {
				title: 'Sample Puzzle',
				description: 'Storybook metadata prefill sample.',
				imageUrl: 'https://picsum.photos/640/320',
				faviconUrl: 'https://picsum.photos/32/32',
				siteName: 'Sample Games'
			},
			prefill: {
				title: 'Sample Puzzle',
				canonicalUrl: url,
				description: 'Storybook metadata prefill sample.',
				tags: ['word', 'daily'],
				siteName: 'Sample Games',
				imageMode: 'auto',
				imagePreviewUrl: 'https://picsum.photos/640/320',
				imageCustomUrl: 'https://picsum.photos/640/320',
				imageFaviconUrl: 'https://picsum.photos/32/32'
			}
		};
	}

	const { Story } = defineMeta({
		title: 'App/PuzzleSubmitForm',
		component: PuzzleSubmitForm,
		tags: ['autodocs'],
		args: {
			onSubmitPuzzle: fn(),
			onResolveUrl: mockResolveUrl,
			onAddExistingPuzzle: fn()
		}
	});
</script>

<Story name="Default" />
