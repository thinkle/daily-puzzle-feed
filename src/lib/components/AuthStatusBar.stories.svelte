<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import AuthStatusBar from './AuthStatusBar.svelte';

	const { Story } = defineMeta({
		title: 'App/AuthStatusBar',
		component: AuthStatusBar,
		tags: ['autodocs'],
		args: {
			isConfigured: true,
			isBusy: false,
			isSignedIn: false,
			userName: '',
			userEmail: '',
			errorMessage: '',
			onSignIn: fn(),
			onSignOut: fn()
		}
	});
</script>

<Story name="Signed Out" />

<Story
	name="Signed In"
	args={{ isSignedIn: true, userName: 'Jane Doe', userEmail: 'jane@example.com' }}
/>

<Story name="Missing Config" args={{ isConfigured: false }} />

<Story name="Error State" args={{ errorMessage: 'Popup closed before sign-in completed.' }} />
