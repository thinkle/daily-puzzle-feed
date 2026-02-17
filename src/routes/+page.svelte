<script lang="ts">
	import 'contain-css-svelte/themes/dark.css';
	import 'contain-css-svelte/vars/defaults.css';

	import { Page, Bar, GridLayout, Card, Button } from 'contain-css-svelte';
</script>

<Page>
	{#snippet header()}
		<Bar --bar-text-align="center" bg="var(--primary-bg)" fg="var(--primary-fg)">
			<h1>Daily Puzzle Feed</h1>
		</Bar>
	{/snippet}
	<!-- Let's add a component for "Adding puzzles" -- the basic plan here will be
   that either have a category based browser of puzzles or support adding a custom puzzle
   by URL -->
	<Button primary>
		{#snippet icon()}
			+
		{/snippet}
		Add Custom Puzzle
	</Button>

	<!-- Let's then under here have a component showing us each puzzle we already have in our 
   daily feed if we have it. -->
</Page>
