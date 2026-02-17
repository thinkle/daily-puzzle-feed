<script lang="ts">
	import { onMount } from 'svelte';

	import { Page, Bar, Card, Button } from 'contain-css-svelte';
	import {
		authSession,
		createEmailPasswordAccount,
		signInWithEmailPassword,
		signInWithGooglePopup,
		signOutCurrentUser,
		startAuthSessionListener
	} from '$lib/auth/session';
	import AuthStatusBar from '$lib/components/AuthStatusBar.svelte';
	import AuthSignInPanel from '$lib/components/AuthSignInPanel.svelte';
	import { isFirebaseConfigured } from '$lib/firebase/client';

	let isAuthActionPending = $state(false);
	let localAuthError = $state('');

	onMount(() => {
		return startAuthSessionListener();
	});

	async function handleGoogleSignIn() {
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

	async function handleEmailSignIn(email: string, password: string) {
		localAuthError = '';
		isAuthActionPending = true;
		try {
			await signInWithEmailPassword(email, password);
		} catch (error) {
			localAuthError = error instanceof Error ? error.message : 'Email sign-in failed.';
		} finally {
			isAuthActionPending = false;
		}
	}

	async function handleEmailSignUp(email: string, password: string) {
		localAuthError = '';
		isAuthActionPending = true;
		try {
			await createEmailPasswordAccount(email, password);
		} catch (error) {
			localAuthError = error instanceof Error ? error.message : 'Account creation failed.';
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
		<Bar bg="var(--primary-bg)" fg="var(--primary-fg)">
			<div class="header-row">
				<h1>Daily Puzzle Feed</h1>
				{#if $authSession.status === 'signed_in'}
					<AuthStatusBar
						isBusy={isAuthActionPending}
						userName={$authSession.user?.displayName ?? ''}
						userEmail={$authSession.user?.email ?? ''}
						onSignOut={handleSignOut}
					/>
				{/if}
			</div>
		</Bar>
	{/snippet}

	{#if $authSession.status === 'loading'}
		<Card>
			<p>Checking session...</p>
		</Card>
	{:else if $authSession.status !== 'signed_in'}
		<AuthSignInPanel
			isConfigured={isFirebaseConfigured}
			isBusy={isAuthActionPending}
			errorMessage={localAuthError || $authSession.error || ''}
			onGoogleSignIn={handleGoogleSignIn}
			onEmailSignIn={handleEmailSignIn}
			onEmailSignUp={handleEmailSignUp}
		/>
	{:else}
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
	{/if}
</Page>

<style>
	.header-row {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: space-between;
		width: 100%;
	}

	h1 {
		margin: 0;
	}
</style>
