<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import AuthStatusBar from './AuthStatusBar.svelte';

	const { Story } = defineMeta({
		title: 'App/AuthStatusBar',
		component: AuthStatusBar,
		tags: ['autodocs'],
		args: {
			isBusy: false,
			userName: 'Jane Doe',
			userEmail: 'jane@example.com',
			onSignOut: fn()
		}
	});
</script>

<Story name="Default" />

<Story name="Busy" args={{ isBusy: true }} />
