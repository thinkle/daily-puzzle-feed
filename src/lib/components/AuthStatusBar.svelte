<script lang="ts">
	import { MiniButton } from 'contain-css-svelte';

	type Props = {
		isBusy?: boolean;
		userName?: string;
		userEmail?: string;
		onSignOut?: () => void;
	};

	let {
		isBusy = false,
		userName = '',
		userEmail = '',
		onSignOut = () => {}
	}: Props = $props();

	const accountLabel = $derived.by(() => userName || userEmail || 'your account');
</script>

<div class="auth-status-inline">
	<span class="account-label">{accountLabel}</span>
	<MiniButton onclick={onSignOut} disabled={isBusy} aria-label="Sign out"><svg width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1h7v2H4v10h5v2H2V1zm8 3l5 4-5 4V9H6V7h4V4z"/></svg></MiniButton>
</div>

<style>
	.auth-status-inline {
		align-items: center;
		display: flex;
		gap: var(--space-md);
		--button-margin: 0;
	}

	.account-label {
		font-size: 0.85em;
		opacity: 0.85;
	}
</style>
