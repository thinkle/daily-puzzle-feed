<script lang="ts">
	import { Bar, Button, Form, FormItem, Input } from 'contain-css-svelte';

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

	function submitEmailSignIn(event?: SubmitEvent) {
		event?.preventDefault();

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
			<Form fullWidth layout="above" onsubmit={submitEmailSignIn} --form-max-width="30rem">
				<FormItem fullWidth>
					{#snippet label()}Email{/snippet}
					<Input type="email" bind:value={email} placeholder="you@example.com" autocomplete="email" />
				</FormItem>
				<FormItem fullWidth>
					{#snippet label()}Password{/snippet}
					<Input
						type="password"
						bind:value={password}
						minlength={6}
						placeholder="6+ characters"
						autocomplete="current-password"
					/>
				</FormItem>
				<FormItem fullWidth>
					{#snippet label()}&nbsp;{/snippet}
					<div class="auth-actions">
						<Button type="submit" disabled={isBusy || !hasCredentials}>Sign In with Email</Button>
						<Button type="button" secondary onclick={submitEmailSignUp} disabled={isBusy || !hasCredentials}>
							Create Account
						</Button>
					</div>
				</FormItem>
			</Form>
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
