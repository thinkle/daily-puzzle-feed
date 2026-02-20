<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { Page, Bar, Card, Container, TabBar, TabItem } from 'contain-css-svelte';
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
	import MyFeedPanel from '$lib/components/MyFeedPanel.svelte';
	import PuzzleCatalogPicker from '$lib/components/PuzzleCatalogPicker.svelte';
	import PuzzleSubmitForm from '$lib/components/PuzzleSubmitForm.svelte';
	import { listApprovedPuzzles, listPuzzlesByIds, updateApprovedPuzzle } from '$lib/data/puzzles';
	import { listUserCustomPuzzlesByIds, saveUserCustomPuzzle } from '$lib/data/user-custom-puzzles';
	import { resolvePuzzleUrl } from '$lib/data/puzzle-resolver';
	import {
		approvePuzzleSubmission,
		listUserSubmittedPuzzles,
		listPendingPuzzleSubmissions,
		rejectPuzzleSubmission,
		savePuzzleSubmission,
		updatePendingPuzzleSubmission
	} from '$lib/data/puzzle-submissions';
	import {
		loadUserFeed,
		migrateUserFeedPuzzleIds,
		savePlayEntry,
		saveStreakSeed,
		saveUserFeedPuzzleIds
	} from '$lib/data/user-feed';
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
		type PuzzlePlayEntry,
		type PuzzleStreakSeed,
		type StreakSeedsMap
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
	let streakSeeds = $state<StreakSeedsMap>({});
	let pendingSubmissions = $state<PuzzleSubmission[]>([]);

	function logFeedDebug(event: string, payload: Record<string, unknown>) {
		if (!dev) {
			return;
		}

		console.info(`[feed-debug] ${event}`, payload);
	}

	function fallbackTitleFromPuzzleId(puzzleId: string) {
		const cleaned = puzzleId
			.replace(/^canonical-/, '')
			.replace(/^custom-/, '')
			.replace(/[-_]+/g, ' ')
			.trim();

		if (!cleaned) {
			return 'Unknown Puzzle';
		}

		return cleaned.replace(/\b\w/g, (match) => match.toUpperCase());
	}

	function createMissingPuzzleDefinition(puzzleId: string): PuzzleDefinition {
		return {
			id: puzzleId,
			title: fallbackTitleFromPuzzleId(puzzleId),
			canonicalUrl: '',
			canonicalUrlNormalized: undefined,
			description: 'This puzzle is in your feed but has no matching catalog entry.',
			tags: [],
			siteName: undefined,
			archive: { enabled: false },
			unlimited: { enabled: false },
			image: undefined,
			active: true,
			source: 'user'
		};
	}

	function buildLegacyPuzzleIdMap(feedIds: string[], approvedIds: Set<string>) {
		const map: Record<string, string> = {};
		for (const feedId of feedIds) {
			if (!feedId.startsWith('custom-')) {
				continue;
			}
			const canonicalId = `canonical-${feedId.slice('custom-'.length)}`;
			if (approvedIds.has(canonicalId)) {
				map[feedId] = canonicalId;
			}
		}
		return map;
	}

	function applyPuzzleIdMapToFeedIds(feedIds: string[], idMap: Record<string, string>) {
		const mapped = feedIds.map((id) => idMap[id] ?? id);
		return mapped.filter((id, index) => mapped.indexOf(id) === index);
	}

	function applyPuzzleIdMapToPlays(playsMap: PlaysMap, idMap: Record<string, string>) {
		const next: PlaysMap = { ...playsMap };
		for (const [fromId, toId] of Object.entries(idMap)) {
			const fromPlays = next[fromId];
			if (!fromPlays) {
				continue;
			}
			next[toId] = { ...fromPlays, ...(next[toId] ?? {}) };
			delete next[fromId];
		}
		return next;
	}

	function applyPuzzleIdMapToStreakSeeds(seeds: StreakSeedsMap, idMap: Record<string, string>) {
		const next: StreakSeedsMap = { ...seeds };
		for (const [fromId, toId] of Object.entries(idMap)) {
			const fromSeed = next[fromId];
			if (!fromSeed) {
				continue;
			}
			if (!next[toId]) {
				next[toId] = fromSeed;
			}
			delete next[fromId];
		}
		return next;
	}

	const isCurrentUserAdmin = $derived.by(() => {
		if ($authSession.status !== 'signed_in') {
			return false;
		}

		const email = $authSession.user?.email?.toLowerCase().trim();
		return Boolean(email && ADMIN_EMAILS.includes(email));
	});

	const feedPuzzles = $derived.by(() => {
		const catalogById = new Map(catalogPuzzles.map((puzzle) => [puzzle.id, puzzle]));
		return feedPuzzleIds.map((id) => catalogById.get(id) ?? createMissingPuzzleDefinition(id));
	});

	onMount(() => {
		return startAuthSessionListener();
	});

	$effect(() => {
		if ($authSession.status !== 'signed_in') {
			catalogPuzzles = [];
			feedPuzzleIds = [];
			plays = {};
			streakSeeds = {};
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
				uid ? loadUserFeed(uid) : Promise.resolve({ feedPuzzleIds: [], plays: {}, streakSeeds: {} })
			]);
			const approvedIds = new Set(approved.map((puzzle) => puzzle.id));
			const legacyPuzzleIdMap = buildLegacyPuzzleIdMap(userData.feedPuzzleIds, approvedIds);
			const hasLegacyMappings = Object.keys(legacyPuzzleIdMap).length > 0;
			let hydratedUserData = userData;

			if (uid && hasLegacyMappings) {
				await migrateUserFeedPuzzleIds(uid, legacyPuzzleIdMap);
				hydratedUserData = {
					feedPuzzleIds: applyPuzzleIdMapToFeedIds(userData.feedPuzzleIds, legacyPuzzleIdMap),
					plays: applyPuzzleIdMapToPlays(userData.plays, legacyPuzzleIdMap),
					streakSeeds: applyPuzzleIdMapToStreakSeeds(userData.streakSeeds ?? {}, legacyPuzzleIdMap)
				};
			}

			const feedIdsMissingFromApproved = hydratedUserData.feedPuzzleIds.filter(
				(id) => !approvedIds.has(id)
			);
			const userCustomFeedPuzzles =
				uid && feedIdsMissingFromApproved.length > 0
					? await listUserCustomPuzzlesByIds(uid, feedIdsMissingFromApproved)
					: [];
			const userCustomById = new Map(userCustomFeedPuzzles.map((puzzle) => [puzzle.id, puzzle]));
			let stillMissingAfterUserCustom = feedIdsMissingFromApproved.filter(
				(id) => !userCustomById.has(id)
			);
			let submissionMatchedCount = 0;

			if (uid && stillMissingAfterUserCustom.length > 0) {
				const submittedPuzzles = await listUserSubmittedPuzzles(uid);
				const submittedById = new Map(submittedPuzzles.map((puzzle) => [puzzle.id, puzzle]));
				const backfilled: PuzzleDefinition[] = [];

				for (const missingId of stillMissingAfterUserCustom) {
					const puzzle = submittedById.get(missingId);
					if (!puzzle) {
						continue;
					}

					userCustomById.set(missingId, puzzle);
					backfilled.push(puzzle);
				}

				submissionMatchedCount = backfilled.length;
				if (backfilled.length > 0) {
					await Promise.all(backfilled.map((puzzle) => saveUserCustomPuzzle(uid, puzzle)));
				}

				stillMissingAfterUserCustom = feedIdsMissingFromApproved.filter(
					(id) => !userCustomById.has(id)
				);
			}

			const fallbackFeedPuzzles =
				stillMissingAfterUserCustom.length > 0
					? await listPuzzlesByIds(stillMissingAfterUserCustom)
					: [];
			const fallbackById = new Map(fallbackFeedPuzzles.map((puzzle) => [puzzle.id, puzzle]));
			const unresolvedFeedIds = stillMissingAfterUserCustom.filter((id) => !fallbackById.has(id));

			catalogPuzzles = [
				...approved,
				...feedIdsMissingFromApproved
					.map((id) => userCustomById.get(id))
					.filter((puzzle): puzzle is PuzzleDefinition => Boolean(puzzle)),
				...feedIdsMissingFromApproved
					.map((id) => fallbackById.get(id))
					.filter((puzzle): puzzle is PuzzleDefinition => Boolean(puzzle))
			];
			feedPuzzleIds = hydratedUserData.feedPuzzleIds;
			plays = hydratedUserData.plays;
			streakSeeds = hydratedUserData.streakSeeds ?? {};

			logFeedDebug('loadSignedInData', {
				uid,
				approvedCount: approved.length,
				feedPuzzleIdCount: hydratedUserData.feedPuzzleIds.length,
				legacyPuzzleIdMap,
				missingFromApprovedCount: feedIdsMissingFromApproved.length,
				userCustomMatchedCount: userCustomFeedPuzzles.length,
				submissionMatchedCount,
				fallbackMatchedCount: fallbackFeedPuzzles.length,
				unresolvedFeedIds
			});

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

	async function handlePlayClick(puzzleId: string) {
		const uid = getCurrentUid();
		if (!uid) return;

		const today = getTodayDateString();
		const existing = plays[puzzleId]?.[today];

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

	async function handleSetStreakSeed(puzzleId: string, seed: PuzzleStreakSeed) {
		const uid = getCurrentUid();
		if (!uid) return;

		streakSeeds = { ...streakSeeds, [puzzleId]: seed };

		try {
			await saveStreakSeed(uid, puzzleId, seed);
		} catch (error) {
			dataError = error instanceof Error ? error.message : 'Could not save streak seed.';
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
			await saveUserCustomPuzzle($authSession.user.uid, nextPuzzle);

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
			ranking?: number;
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

	let activeTab: 'feed' | 'add' | 'custom' | 'admin' = $state('feed');
</script>

<Page>
	{#snippet header()}
		<Bar bg="var(--primary-bg)" fg="var(--primary-fg)" --bar-margin-bottom="0">
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
	<TabBar>
		<TabItem active={activeTab === 'feed'} onclick={() => (activeTab = 'feed')}>My Feed</TabItem>
		<TabItem active={activeTab === 'add'} onclick={() => (activeTab = 'add')}>Add Puzzle</TabItem>
		<TabItem active={activeTab === 'custom'} onclick={() => (activeTab = 'custom')}
			>Custom Puzzle</TabItem
		>
		{#if isCurrentUserAdmin}
			<TabItem active={activeTab === 'admin'} onclick={() => (activeTab = 'admin')}>Admin</TabItem>
		{/if}
	</TabBar>

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

		{#if activeTab === 'feed'}
			<Container>
				<MyFeedPanel
					{feedPuzzles}
					{plays}
					{streakSeeds}
					onPlayClick={handlePlayClick}
					onMarkPlayed={handleMarkPlayed}
					onRemove={removePuzzleFromFeed}
					onSetStreakSeed={handleSetStreakSeed}
				/>
			</Container>
		{:else if activeTab === 'add'}
			<PuzzleCatalogPicker
				catalog={catalogPuzzles}
				addedPuzzleIds={feedPuzzleIds}
				isAdmin={isCurrentUserAdmin}
				onAdd={(puzzle) => addPuzzlesToFeed([puzzle])}
				onEditPuzzle={handleEditCatalogPuzzle}
			/>
		{:else if activeTab === 'custom'}
			<PuzzleSubmitForm
				onResolveUrl={handleResolvePuzzleUrl}
				onAddExistingPuzzle={addExistingPuzzleToFeed}
				onSubmitPuzzle={addCustomPuzzle}
			/>
		{:else if activeTab === 'admin' && isCurrentUserAdmin}
			<Container>
				<PuzzleApprovalPanel
					submissions={pendingSubmissions}
					isBusy={isReviewBusy}
					onSaveEdit={handleSaveSubmissionEdit}
					onApprove={handleApproveSubmission}
					onReject={handleRejectSubmission}
				/>
			</Container>
		{/if}
	{/if}
</Page>

<style>
	.header-row {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		column-gap: var(--gap);
		justify-content: space-between;
		width: 100%;
	}

	@media (max-width: 700px) {
		.header-row {
			justify-content: center;
			text-align: center;
			font-size: 0.8rem;
		}
	}

	h1 {
		margin: 0;
	}
</style>
