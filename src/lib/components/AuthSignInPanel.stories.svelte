<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import AuthSignInPanel from './AuthSignInPanel.svelte';

	const { Story } = defineMeta({
		title: 'App/AuthSignInPanel',
		component: AuthSignInPanel,
		tags: ['autodocs'],
		args: {
			isConfigured: true,
			isBusy: false,
			errorMessage: '',
			onGoogleSignIn: fn(),
			onEmailSignIn: fn(),
			onEmailSignUp: fn()
		}
	});
</script>

<Story name="Default" />

<Story name="Missing Config" args={{ isConfigured: false }} />

<Story name="Busy" args={{ isBusy: true }} />

<Story name="Error State" args={{ errorMessage: 'Popup closed before sign-in completed.' }} />
