<script lang="ts">
	import { Button } from 'contain-css-svelte';

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
	<p>Signed in as <strong>{accountLabel}</strong>.</p>
	<Button onclick={onSignOut} disabled={isBusy}>Sign Out</Button>
</div>

<style>
	.auth-status-inline {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	p {
		margin: 0;
	}
</style>
