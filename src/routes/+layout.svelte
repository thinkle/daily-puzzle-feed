<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import ContainBase from '$lib/components/ContainBase.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ContainBase />
{@render children()}
