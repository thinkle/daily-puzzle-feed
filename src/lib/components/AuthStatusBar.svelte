<script lang="ts">
	import { Bar, Button } from 'contain-css-svelte';

	type Props = {
		isConfigured?: boolean;
		isBusy?: boolean;
		isSignedIn?: boolean;
		userName?: string;
		userEmail?: string;
		errorMessage?: string;
		onSignIn?: () => void;
		onSignOut?: () => void;
	};

	let {
		isConfigured = true,
		isBusy = false,
		isSignedIn = false,
		userName = '',
		userEmail = '',
		errorMessage = '',
		onSignIn = () => {},
		onSignOut = () => {}
	}: Props = $props();

	const accountLabel = $derived.by(() => userName || userEmail || 'your account');
</script>

<Bar bg="var(--secondary-bg, var(--bg))">
	<div class="auth-status">
		{#if !isConfigured}
			<p>Firebase is not configured yet. Add `PUBLIC_FIREBASE_*` keys to `.env`.</p>
		{:else if isSignedIn}
			<div class="auth-row">
				<p>Signed in as <strong>{accountLabel}</strong>.</p>
				<Button onclick={onSignOut} disabled={isBusy}>Sign Out</Button>
			</div>
		{:else}
			<div class="auth-row">
				<p>Sign in with Google to save puzzle progress.</p>
				<Button primary onclick={onSignIn} disabled={isBusy}>Sign In with Google</Button>
			</div>
		{/if}

		{#if errorMessage}
			<p class="error">{errorMessage}</p>
		{/if}
	</div>
</Bar>

<style>
	.auth-status {
		display: grid;
		gap: 0.5rem;
		width: 100%;
	}

	.auth-row {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: space-between;
	}

	p {
		margin: 0;
	}

	.error {
		color: var(--error-fg, #b30000);
		font-size: 0.95rem;
	}
</style>
