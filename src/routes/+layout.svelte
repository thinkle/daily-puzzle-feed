<script lang="ts">
	import { onMount } from 'svelte';
	import ContainBase from '$lib/components/ContainBase.svelte';
	import { initTheme } from '$lib/stores/theme.svelte';

	let { children } = $props();

	onMount(() => {
		initTheme();
	});
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/daily-puzzle-feed-icon.png" />
</svelte:head>

<ContainBase />
{@render children()}
