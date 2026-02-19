<script lang="ts">
	import ContainBase from '$lib/components/ContainBase.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/daily-puzzle-feed-icon.png" />
</svelte:head>

<ContainBase />
{@render children()}
