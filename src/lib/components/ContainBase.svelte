<script lang="ts">
	import 'contain-css-svelte/themes/dark.css';
	import 'contain-css-svelte/vars/defaults.css';
	import '$lib/styles/contain-base.css';

	let { children } = $props();
</script>

<div class="contain-base">
	{@render children?.()}
</div>
