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
		onEmailSignIn?: (email: string, password: string) => void | Promise<void>;
		onEmailSignUp?: (email: string, password: string) => void | Promise<void>;
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
		onEmailSignIn = () => {},
		onEmailSignUp = () => {},
		onSignOut = () => {}
	}: Props = $props();

	const accountLabel = $derived.by(() => userName || userEmail || 'your account');
	let email = $state('');
	let password = $state('');

	const hasCredentials = $derived.by(() => email.trim().length > 0 && password.length >= 6);

	function submitEmailSignIn() {
		if (!hasCredentials) {
			return;
		}

		onEmailSignIn(email.trim(), password);
	}

	function submitEmailSignUp() {
		if (!hasCredentials) {
			return;
		}

		onEmailSignUp(email.trim(), password);
	}
</script>

<Bar bg="var(--secondary-bg, var(--bg))" fg="var(--secondary-fg, var(--fg))">
	<div class="auth-status">
		{#if !isConfigured}
			<p>Firebase is not configured yet. Add `PUBLIC_FIREBASE_*` keys to `.env`.</p>
		{:else if isSignedIn}
			<div class="auth-row">
				<p>Signed in as <strong>{accountLabel}</strong>.</p>
				<Button onclick={onSignOut} disabled={isBusy}>Sign Out</Button>
			</div>
		{:else}
			<div class="auth-row auth-row-stack">
				<p>Sign in with Google or email/password to save puzzle progress.</p>
				<Button primary onclick={onSignIn} disabled={isBusy}>Sign In with Google</Button>
			</div>
			<div class="email-auth">
				<label>
					<span>Email</span>
					<input type="email" bind:value={email} placeholder="you@example.com" autocomplete="email" />
				</label>
				<label>
					<span>Password</span>
					<input
						type="password"
						bind:value={password}
						minlength="6"
						placeholder="6+ characters"
						autocomplete="current-password"
					/>
				</label>
				<div class="auth-actions">
					<Button onclick={submitEmailSignIn} disabled={isBusy || !hasCredentials}>
						Sign In with Email
					</Button>
					<Button secondary onclick={submitEmailSignUp} disabled={isBusy || !hasCredentials}>
						Create Account
					</Button>
				</div>
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

	.auth-row-stack {
		align-items: start;
		flex-direction: column;
	}

	.email-auth {
		display: grid;
		gap: 0.5rem;
		width: min(100%, 30rem);
	}

	label {
		display: grid;
		gap: 0.25rem;
	}

	span {
		font-size: 0.9rem;
	}

	input {
		background: var(--input-bg, var(--bg));
		border: var(--border-width, 1px) solid var(--input-border-color, var(--border-color, #666));
		border-radius: var(--border-radius, 0.35rem);
		color: var(--input-fg, var(--fg));
		font: inherit;
		padding: 0.55rem 0.7rem;
	}

	.auth-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	p {
		margin: 0;
	}

	.error {
		color: var(--error-fg, #b30000);
		font-size: 0.95rem;
	}
</style>
