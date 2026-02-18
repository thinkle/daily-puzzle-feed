<script lang="ts">
	import { onMount } from 'svelte';
	import { Page, Bar, Button, ButtonLink, Card, GridLayout } from 'contain-css-svelte';
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
	import PuzzleApprovalPanel from '$lib/components/PuzzleApprovalPanel.svelte';
	import PuzzleCard from '$lib/components/PuzzleCard.svelte';
	import PuzzleCatalogPicker from '$lib/components/PuzzleCatalogPicker.svelte';
	import PuzzleSubmitForm from '$lib/components/PuzzleSubmitForm.svelte';
	import { listApprovedPuzzles, updateApprovedPuzzle } from '$lib/data/puzzles';
	import { resolvePuzzleUrl } from '$lib/data/puzzle-resolver';
	import {
		approvePuzzleSubmission,
		listPendingPuzzleSubmissions,
		rejectPuzzleSubmission,
		savePuzzleSubmission,
		updatePendingPuzzleSubmission
	} from '$lib/data/puzzle-submissions';
	import { loadUserFeed, savePlayEntry, saveUserFeedPuzzleIds } from '$lib/data/user-feed';
	import { isFirebaseConfigured } from '$lib/firebase/client';
	import {
		arePuzzleUrlsEquivalent,
		type PuzzleDefinition,
		type PuzzleDraftInput,
		type PuzzleSubmission
	} from '$lib/model/puzzle';
	import {
		getTodayDateString,
		type PlaysMap,
		type PuzzleOutcome,
		type PuzzlePlayEntry
	} from '$lib/model/user-data';

	const ADMIN_EMAILS = ['tmhinkle@gmail.com', 'thinkle@innovationcharter.org'];

	let isAuthActionPending = $state(false);
	let localAuthError = $state('');
	let dataError = $state('');
	let isDataLoading = $state(false);
	let isReviewBusy = $state(false);

	let catalogPuzzles = $state<PuzzleDefinition[]>([]);
	let feedPuzzleIds = $state<string[]>([]);
	let plays = $state<PlaysMap>({});
	let pendingSubmissions = $state<PuzzleSubmission[]>([]);

	const isCurrentUserAdmin = $derived.by(() => {
		if ($authSession.status !== 'signed_in') {
			return false;
		}

		const email = $authSession.user?.email?.toLowerCase().trim();
		return Boolean(email && ADMIN_EMAILS.includes(email));
	});

	const feedPuzzles = $derived.by(() =>
		feedPuzzleIds
			.map((id) => catalogPuzzles.find((puzzle) => puzzle.id === id) ?? null)
			.filter((puzzle): puzzle is PuzzleDefinition => puzzle !== null)
	);

	onMount(() => {
		return startAuthSessionListener();
	});

	$effect(() => {
		if ($authSession.status !== 'signed_in') {
			catalogPuzzles = [];
			feedPuzzleIds = [];
			plays = {};
			pendingSubmissions = [];
			dataError = '';
			return;
		}

		void loadSignedInData();
	});

	function getCurrentUid(): string | null {
		if ($authSession.status === 'signed_in' && $authSession.user) {
			return $authSession.user.uid;
		}
		return null;
	}

	async function loadSignedInData() {
		isDataLoading = true;
		dataError = '';

		try {
			const uid = getCurrentUid();
			const [approved, userData] = await Promise.all([
				listApprovedPuzzles(),
				uid ? loadUserFeed(uid) : Promise.resolve({ feedPuzzleIds: [], plays: {} })
			]);

			catalogPuzzles = approved;
			feedPuzzleIds = userData.feedPuzzleIds;
			plays = userData.plays;

			if (isCurrentUserAdmin) {
				pendingSubmissions = await listPendingPuzzleSubmissions();
			} else {
				pendingSubmissions = [];
			}
		} catch (error) {
			dataError = error instanceof Error ? error.message : 'Could not load puzzle data.';
		} finally {
			isDataLoading = false;
		}
	}

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
		void persistFeedIds();
	}

	function removePuzzleFromFeed(id: string) {
		feedPuzzleIds = feedPuzzleIds.filter((puzzleId) => puzzleId !== id);
		void persistFeedIds();
	}

	async function persistFeedIds() {
		const uid = getCurrentUid();
		if (!uid) return;
		try {
			await saveUserFeedPuzzleIds(uid, feedPuzzleIds);
		} catch (error) {
			dataError = error instanceof Error ? error.message : 'Could not save feed.';
		}
	}

	function getTodayPlayEntry(puzzleId: string): PuzzlePlayEntry | undefined {
		const today = getTodayDateString();
		return plays[puzzleId]?.[today];
	}

	async function handlePlayClick(puzzleId: string) {
		const uid = getCurrentUid();
		if (!uid) return;

		const today = getTodayDateString();
		const existing = getTodayPlayEntry(puzzleId);

		// Don't downgrade — if already played, keep it
		if (existing?.progress === 'played') return;

		const entry: PuzzlePlayEntry = { progress: 'visited' };
		plays = { ...plays, [puzzleId]: { ...plays[puzzleId], [today]: entry } };

		try {
			await savePlayEntry(uid, puzzleId, today, entry);
		} catch (error) {
			dataError = error instanceof Error ? error.message : 'Could not save play state.';
		}
	}

	async function handleMarkPlayed(puzzleId: string, outcome: PuzzleOutcome) {
		const uid = getCurrentUid();
		if (!uid) return;

		const today = getTodayDateString();
		const entry: PuzzlePlayEntry = { progress: 'played', outcome };
		plays = { ...plays, [puzzleId]: { ...plays[puzzleId], [today]: entry } };

		try {
			await savePlayEntry(uid, puzzleId, today, entry);
		} catch (error) {
			dataError = error instanceof Error ? error.message : 'Could not save play state.';
		}
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
			const submissionId = await savePuzzleSubmission({
				uid: $authSession.user.uid,
				email: $authSession.user.email,
				displayName: $authSession.user.displayName,
				draft: context.draft,
				resolveSource: context.resolveSource,
				metadata: context.metadata
			});

			if (!submissionId) {
				dataError = 'Saved to your feed, but failed to queue this puzzle for admin review.';
				return;
			}

			if (isCurrentUserAdmin) {
				pendingSubmissions = await listPendingPuzzleSubmissions();
			}
		}
	}

	async function handleApproveSubmission(submission: PuzzleSubmission) {
		if ($authSession.status !== 'signed_in' || !$authSession.user) {
			return;
		}

		isReviewBusy = true;
		try {
			const approved = await approvePuzzleSubmission({
				submissionId: submission.id,
				reviewer: {
					uid: $authSession.user.uid,
					email: $authSession.user.email,
					displayName: $authSession.user.displayName
				}
			});

			if (approved) {
				ensureCatalogPuzzle(approved);
			}
			pendingSubmissions = pendingSubmissions.filter((item) => item.id !== submission.id);
		} catch (error) {
			dataError = error instanceof Error ? error.message : 'Could not approve puzzle submission.';
		} finally {
			isReviewBusy = false;
		}
	}

	async function handleRejectSubmission(submission: PuzzleSubmission) {
		if ($authSession.status !== 'signed_in' || !$authSession.user) {
			return;
		}

		isReviewBusy = true;
		try {
			await rejectPuzzleSubmission({
				submissionId: submission.id,
				reviewer: {
					uid: $authSession.user.uid,
					email: $authSession.user.email,
					displayName: $authSession.user.displayName
				}
			});
			pendingSubmissions = pendingSubmissions.filter((item) => item.id !== submission.id);
		} catch (error) {
			dataError = error instanceof Error ? error.message : 'Could not reject puzzle submission.';
		} finally {
			isReviewBusy = false;
		}
	}

	async function handleEditCatalogPuzzle(
		puzzle: PuzzleDefinition,
		update: {
			title: string;
			canonicalUrl: string;
			description?: string;
			tags: PuzzleDefinition['tags'];
			siteName?: string;
		}
	) {
		try {
			const updated = await updateApprovedPuzzle({
				puzzleId: puzzle.id,
				...update
			});

			if (updated) {
				catalogPuzzles = catalogPuzzles.map((p) => (p.id === updated.id ? updated : p));
			}
		} catch (error) {
			dataError = error instanceof Error ? error.message : 'Could not save puzzle edits.';
		}
	}

	async function handleSaveSubmissionEdit(
		submission: PuzzleSubmission,
		update: {
			title: string;
			canonicalUrl: string;
			description?: string;
			tags: PuzzleSubmission['tags'];
			siteName?: string;
		}
	) {
		if ($authSession.status !== 'signed_in' || !$authSession.user) {
			return;
		}

		isReviewBusy = true;
		try {
			const updated = await updatePendingPuzzleSubmission({
				submissionId: submission.id,
				title: update.title,
				canonicalUrl: update.canonicalUrl,
				description: update.description,
				tags: update.tags,
				siteName: update.siteName,
				editor: {
					uid: $authSession.user.uid,
					email: $authSession.user.email,
					displayName: $authSession.user.displayName
				}
			});

			if (!updated) {
				return;
			}

			pendingSubmissions = pendingSubmissions.map((item) =>
				item.id === updated.id ? updated : item
			);
		} catch (error) {
			dataError = error instanceof Error ? error.message : 'Could not save submission edits.';
		} finally {
			isReviewBusy = false;
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
		{#if dataError}
			<Card><p>{dataError}</p></Card>
		{/if}
		{#if isDataLoading}
			<Card><p>Loading puzzles...</p></Card>
		{/if}

		<PuzzleSubmitForm
			onResolveUrl={handleResolvePuzzleUrl}
			onAddExistingPuzzle={addExistingPuzzleToFeed}
			onSubmitPuzzle={addCustomPuzzle}
		/>

		<PuzzleCatalogPicker
			catalog={catalogPuzzles}
			addedPuzzleIds={feedPuzzleIds}
			isAdmin={isCurrentUserAdmin}
			onAdd={(puzzle) => addPuzzlesToFeed([puzzle])}
			onEditPuzzle={handleEditCatalogPuzzle}
		/>

		<h2>My Puzzle Feed</h2>
		{#if feedPuzzles.length === 0}
			<p>No puzzles in your feed yet.</p>
		{:else}
			<div class="feed-puzzles-wrap">
				<GridLayout
					--item-width="var(--card-width)"
					--gap="0.75rem"
					--grid-justify-content="start"
					--grid-place-content="start"
				>
					{#each feedPuzzles as puzzle (puzzle.id)}
						{@const todayPlay = getTodayPlayEntry(puzzle.id)}
						<PuzzleCard {puzzle}>
							{#snippet actions()}
								<ButtonLink
									href={puzzle.canonicalUrl}
									target="_blank"
									rel="noopener noreferrer"
									onclick={() => handlePlayClick(puzzle.id)}
								>
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
								{#if todayPlay?.progress === 'played'}
									<Button disabled>
										{todayPlay.outcome === 'won'
											? 'Won'
											: todayPlay.outcome === 'lost'
												? 'Lost'
												: 'Played'}
									</Button>
								{:else}
									<Button
										secondary
										onclick={() => handleMarkPlayed(puzzle.id, 'won')}
									>
										Won
									</Button>
									<Button
										secondary
										onclick={() => handleMarkPlayed(puzzle.id, 'lost')}
									>
										Lost
									</Button>
									<Button
										secondary
										onclick={() => handleMarkPlayed(puzzle.id, 'unknown')}
									>
										Played
									</Button>
								{/if}
								<Button onclick={() => removePuzzleFromFeed(puzzle.id)}>Remove</Button>
							{/snippet}
						</PuzzleCard>
					{/each}
				</GridLayout>
			</div>
		{/if}

		{#if isCurrentUserAdmin}
			<PuzzleApprovalPanel
				submissions={pendingSubmissions}
				isBusy={isReviewBusy}
				onSaveEdit={handleSaveSubmissionEdit}
				onApprove={handleApproveSubmission}
				onReject={handleRejectSubmission}
			/>
		{/if}
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
	p {
		margin: 0;
	}
</style>
