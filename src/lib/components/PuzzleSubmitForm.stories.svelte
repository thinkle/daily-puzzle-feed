<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import PuzzleSubmitForm from './PuzzleSubmitForm.svelte';

	const { Story } = defineMeta({
		title: 'App/PuzzleSubmitForm',
		component: PuzzleSubmitForm,
		tags: ['autodocs'],
		args: {
			onSubmitPuzzle: fn()
		}
	});
</script>

<Story name="Default" />
