<script lang="ts">
	import { onMount } from 'svelte';

	import { Page, Bar, Button, ButtonLink, Card, GridLayout, Tag, Tile } from 'contain-css-svelte';
	import {
		authSession,
		createEmailPasswordAccount,
		signInWithEmailPassword,
		signInWithGooglePopup,
		signOutCurrentUser,
		startAuthSessionListener
	} from '$lib/auth/session';
	import AuthStatusBar from '$lib/components/AuthStatusBar.svelte';
	import AuthSignInPanel from '$lib/components/AuthSignInPanel.svelte';
	import PuzzleCatalogPicker from '$lib/components/PuzzleCatalogPicker.svelte';
	import PuzzleSubmitForm from '$lib/components/PuzzleSubmitForm.svelte';
	import { resolvePuzzleUrl } from '$lib/data/puzzle-resolver';
	import { savePuzzleSubmission } from '$lib/data/puzzle-submissions';
	import { isFirebaseConfigured } from '$lib/firebase/client';
	import { getSeedPuzzleCatalog } from '$lib/data/puzzle-catalog';
	import {
		arePuzzleUrlsEquivalent,
		getPuzzleDisplayImageUrl,
		type PuzzleDefinition,
		type PuzzleDraftInput
	} from '$lib/model/puzzle';

	let isAuthActionPending = $state(false);
	let localAuthError = $state('');
	let catalogPuzzles = $state<PuzzleDefinition[]>(getSeedPuzzleCatalog());
	let feedPuzzleIds = $state<string[]>([]);

	onMount(() => {
		return startAuthSessionListener();
	});

	async function handleGoogleSignIn() {
		localAuthError = '';
		isAuthActionPending = true;
		try {
			await signInWithGooglePopup();
		} catch (error) {
			localAuthError = error instanceof Error ? error.message : 'Google sign-in failed.';
		} finally {
			isAuthActionPending = false;
		}
	}

	async function handleEmailSignIn(email: string, password: string) {
		localAuthError = '';
		isAuthActionPending = true;
		try {
			await signInWithEmailPassword(email, password);
		} catch (error) {
			localAuthError = error instanceof Error ? error.message : 'Email sign-in failed.';
		} finally {
			isAuthActionPending = false;
		}
	}

	async function handleEmailSignUp(email: string, password: string) {
		localAuthError = '';
		isAuthActionPending = true;
		try {
			await createEmailPasswordAccount(email, password);
		} catch (error) {
			localAuthError = error instanceof Error ? error.message : 'Account creation failed.';
		} finally {
			isAuthActionPending = false;
		}
	}

	async function handleSignOut() {
		localAuthError = '';
		isAuthActionPending = true;
		try {
			await signOutCurrentUser();
		} catch (error) {
			localAuthError = error instanceof Error ? error.message : 'Sign-out failed.';
		} finally {
			isAuthActionPending = false;
		}
	}

	function getPuzzleById(id: string) {
		return catalogPuzzles.find((puzzle) => puzzle.id === id) ?? null;
	}

	function ensureCatalogPuzzle(puzzle: PuzzleDefinition) {
		const existing = catalogPuzzles.find(
			(candidate) =>
				candidate.id === puzzle.id ||
				arePuzzleUrlsEquivalent(candidate.canonicalUrl, puzzle.canonicalUrl)
		);

		if (existing) {
			return existing;
		}

		catalogPuzzles = [puzzle, ...catalogPuzzles];
		return puzzle;
	}

	const feedPuzzles = $derived.by(() =>
		feedPuzzleIds
			.map((id) => getPuzzleById(id))
			.filter((puzzle): puzzle is PuzzleDefinition => puzzle !== null)
	);

	function addPuzzlesToFeed(puzzles: PuzzleDefinition[]) {
		const existing = new Set(feedPuzzleIds);
		const next = [...feedPuzzleIds];

		for (const puzzle of puzzles) {
			if (!existing.has(puzzle.id)) {
				existing.add(puzzle.id);
				next.push(puzzle.id);
			}
		}

		feedPuzzleIds = next;
	}

	function removePuzzleFromFeed(id: string) {
		feedPuzzleIds = feedPuzzleIds.filter((puzzleId) => puzzleId !== id);
	}

	async function handleResolvePuzzleUrl(url: string) {
		return resolvePuzzleUrl({
			url,
			catalog: catalogPuzzles
		});
	}

	async function addExistingPuzzleToFeed(puzzle: PuzzleDefinition) {
		const nextPuzzle = ensureCatalogPuzzle(puzzle);
		addPuzzlesToFeed([nextPuzzle]);
	}

	async function addCustomPuzzle(
		puzzle: PuzzleDefinition,
		context: {
			draft: PuzzleDraftInput;
			resolveSource: 'metadata_endpoint' | 'fallback' | 'manual';
			metadata: Record<string, unknown> | null;
		}
	) {
		const byUrl = catalogPuzzles.find((candidate) =>
			arePuzzleUrlsEquivalent(candidate.canonicalUrl, puzzle.canonicalUrl)
		);
		if (byUrl) {
			addPuzzlesToFeed([byUrl]);
			return;
		}

		let nextPuzzle = puzzle;
		let suffix = 2;

		while (catalogPuzzles.some((existing) => existing.id === nextPuzzle.id)) {
			nextPuzzle = { ...puzzle, id: `${puzzle.id}-${suffix}` };
			suffix += 1;
		}

		catalogPuzzles = [nextPuzzle, ...catalogPuzzles];
		addPuzzlesToFeed([nextPuzzle]);

		if ($authSession.status === 'signed_in' && $authSession.user) {
			await savePuzzleSubmission({
				uid: $authSession.user.uid,
				email: $authSession.user.email,
				displayName: $authSession.user.displayName,
				draft: context.draft,
				resolveSource: context.resolveSource,
				metadata: context.metadata
			});
		}
	}
</script>

<Page>
	{#snippet header()}
		<Bar bg="var(--primary-bg)" fg="var(--primary-fg)">
			<div class="header-row">
				<h1>Daily Puzzle Feed</h1>
				{#if $authSession.status === 'signed_in'}
					<AuthStatusBar
						isBusy={isAuthActionPending}
						userName={$authSession.user?.displayName ?? ''}
						userEmail={$authSession.user?.email ?? ''}
						onSignOut={handleSignOut}
					/>
				{/if}
			</div>
		</Bar>
	{/snippet}

	{#if $authSession.status === 'loading'}
		<Card>
			<p>Checking session...</p>
		</Card>
	{:else if $authSession.status !== 'signed_in'}
		<AuthSignInPanel
			isConfigured={isFirebaseConfigured}
			isBusy={isAuthActionPending}
			errorMessage={localAuthError || $authSession.error || ''}
			onGoogleSignIn={handleGoogleSignIn}
			onEmailSignIn={handleEmailSignIn}
			onEmailSignUp={handleEmailSignUp}
		/>
	{:else}
		<PuzzleCatalogPicker
			catalog={catalogPuzzles}
			addedPuzzleIds={feedPuzzleIds}
			onAddSelected={addPuzzlesToFeed}
			itemWidth="20rem"
			gridGap="0.75rem"
		/>

		<h2>My Puzzle Feed</h2>
		{#if feedPuzzles.length === 0}
			<p>No puzzles added yet. Pick some from the catalog or submit your own.</p>
		{:else}
			<div class="feed-puzzles-wrap">
				<GridLayout
					--item-width="20rem"
					--gap="0.75rem"
					--grid-justify-content="start"
					--grid-place-content="start"
				>
					{#each feedPuzzles as puzzle (puzzle.id)}
						<Tile>
							<div class="tile-content">
								{#if getPuzzleDisplayImageUrl(puzzle)}
									<img
										class="puzzle-image"
										src={getPuzzleDisplayImageUrl(puzzle)}
										alt={`${puzzle.title} preview`}
									/>
								{/if}
								<h3>{puzzle.title}</h3>
								<div class="tag-row">
									{#each puzzle.tags as tag (tag)}
										<Tag>{tag}</Tag>
									{/each}
								</div>
								<div class="feed-actions">
									<ButtonLink href={puzzle.canonicalUrl} target="_blank" rel="noopener noreferrer">
										Play
									</ButtonLink>
									{#if puzzle.archive.enabled && puzzle.archive.url}
										<ButtonLink
											href={puzzle.archive.url}
											target="_blank"
											rel="noopener noreferrer"
											secondary
										>
											Archive
										</ButtonLink>
									{/if}
									{#if puzzle.unlimited.enabled && puzzle.unlimited.url}
										<ButtonLink
											href={puzzle.unlimited.url}
											target="_blank"
											rel="noopener noreferrer"
											secondary
										>
											Unlimited
										</ButtonLink>
									{/if}
									<Button onclick={() => removePuzzleFromFeed(puzzle.id)}>Remove</Button>
								</div>
							</div>
						</Tile>
					{/each}
				</GridLayout>
			</div>
		{/if}

		<PuzzleSubmitForm
			onResolveUrl={handleResolvePuzzleUrl}
			onAddExistingPuzzle={addExistingPuzzleToFeed}
			onSubmitPuzzle={addCustomPuzzle}
		/>
	{/if}
</Page>

<style>
	.header-row {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: space-between;
		width: 100%;
	}

	h1 {
		margin: 0;
	}

	h2,
	h3,
	p {
		margin: 0;
	}

	.tile-content {
		display: grid;
		gap: 0.6rem;
		padding-top: 1rem;
		text-align: left;
		width: 100%;
	}

	.puzzle-image {
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius, 8px);
		height: 7.5rem;
		object-fit: cover;
		width: 100%;
	}

	.feed-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.tag-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
</style>
