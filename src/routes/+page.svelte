<script lang="ts">
	import 'contain-css-svelte/themes/dark.css';
	import 'contain-css-svelte/vars/defaults.css';
	import { onMount } from 'svelte';

	import { Page, Bar, Card, Button } from 'contain-css-svelte';
	import {
		authSession,
		signInWithGooglePopup,
		signOutCurrentUser,
		startAuthSessionListener
	} from '$lib/auth/session';
	import AuthStatusBar from '$lib/components/AuthStatusBar.svelte';
	import { isFirebaseConfigured } from '$lib/firebase/client';

	let isAuthActionPending = $state(false);
	let localAuthError = $state('');

	onMount(() => {
		return startAuthSessionListener();
	});

	async function handleSignIn() {
		localAuthError = '';
		isAuthActionPending = true;
		try {
			await signInWithGooglePopup();
		} catch (error) {
			localAuthError = error instanceof Error ? error.message : 'Google sign-in failed.';
		} finally {
			isAuthActionPending = false;
		}
	}

	async function handleSignOut() {
		localAuthError = '';
		isAuthActionPending = true;
		try {
			await signOutCurrentUser();
		} catch (error) {
			localAuthError = error instanceof Error ? error.message : 'Sign-out failed.';
		} finally {
			isAuthActionPending = false;
		}
	}
</script>

<Page>
	{#snippet header()}
		<Bar --bar-text-align="center" bg="var(--primary-bg)" fg="var(--primary-fg)">
			<h1>Daily Puzzle Feed</h1>
		</Bar>
		<AuthStatusBar
			isConfigured={isFirebaseConfigured}
			isBusy={isAuthActionPending || $authSession.status === 'loading'}
			isSignedIn={$authSession.status === 'signed_in'}
			userName={$authSession.user?.displayName ?? ''}
			userEmail={$authSession.user?.email ?? ''}
			errorMessage={localAuthError || $authSession.error || ''}
			onSignIn={handleSignIn}
			onSignOut={handleSignOut}
		/>
	{/snippet}

	<Card>
		<h2>Daily Feed</h2>
		<p>Your puzzle list and today status tracker are next in the sprint.</p>
		<Button primary>
			{#snippet icon()}
				+
			{/snippet}
			Add Custom Puzzle
		</Button>
	</Card>
</Page>
