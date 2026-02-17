<script lang="ts">
	import { Button, Card, Form, FormItem, Input } from 'contain-css-svelte';

	type Props = {
		isConfigured?: boolean;
		isBusy?: boolean;
		errorMessage?: string;
		onGoogleSignIn?: () => void;
		onEmailSignIn?: (email: string, password: string) => void | Promise<void>;
		onEmailSignUp?: (email: string, password: string) => void | Promise<void>;
	};

	let {
		isConfigured = true,
		isBusy = false,
		errorMessage = '',
		onGoogleSignIn = () => {},
		onEmailSignIn = () => {},
		onEmailSignUp = () => {}
	}: Props = $props();

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

<section class="auth-sign-in">
	<Card bg="var(--secondary-bg, var(--bg))" fg="var(--secondary-fg, var(--fg))">
		<h2>Sign In</h2>
		<p>Sign in to access your puzzle feed and daily progress tracking.</p>

		{#if !isConfigured}
			<p class="error">Firebase is not configured yet. Add `PUBLIC_FIREBASE_*` keys to `.env`.</p>
		{:else}
			<Button primary onclick={onGoogleSignIn} disabled={isBusy}>Sign In with Google</Button>

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
	</Card>
</section>

<style>
	.auth-sign-in {
		display: grid;
		justify-items: center;
		padding: 8vh 1rem 1rem;
	}

	.auth-sign-in :global(.card) {
		display: grid;
		gap: 0.9rem;
		width: min(100%, 36rem);
	}

	h2 {
		margin: 0;
	}

	p {
		margin: 0;
	}

	.auth-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.error {
		color: var(--error-fg, #b30000);
		font-size: 0.95rem;
	}
</style>
