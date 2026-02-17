# Daily Puzzle Feed: Agent Guide

## Product Summary

Daily Puzzle Feed is a personal dashboard for daily online puzzles (Wordle-like, trivia, geography, etc.).
Core UX: one place to open puzzles, track puzzle status for each day, and view progress history/streaks.

The app should feel like a lightweight "reader" for daily games:

- Quick launch links for selected puzzles
- Daily status tracking per puzzle
- Simple progress insights (completed, won/lost, streaks)

## Tech Stack

- Frontend: SvelteKit (Svelte 5, TypeScript)
- UI System: `contain-css-svelte` (see `AGENTS-UI.md`)
- Auth: Google sign-in via Firebase Authentication
- Data Store: Firestore (free-tier-conscious reads/writes)
- Optional backend helpers: Firebase Cloud Functions (only when needed, e.g. metadata fetch/proxy)

Note: ContainCSS is a UI library, not backend infrastructure.

## Current Scope (MVP)

### In Scope

- Google sign-in / sign-out
- User-managed puzzle list
- One daily play record per puzzle per local date
- Status transitions: `visited` -> `completed` and optional terminal outcomes (`won`, `lost`)
- Basic feed UI for "today" and recent history
- Streak-ready data (even if full streak UI lands later)

### Out of Scope (for first milestone)

- Full social graph
- Public sharing feeds
- Popularity/recommendation ranking
- Heavy scraping pipelines

## Data Model Principles

- Keep models explicitly typed in shared TypeScript modules.
- Treat Firestore docs as persistence DTOs; map to app-domain types where needed.
- Prefer append/update-light patterns to stay in free-tier limits.
- Store both query-friendly daily key and canonical timestamps.

### Date Strategy

For each play record:

- `dayKey: number` as `YYYYMMDD` in user timezone (fast equality/range queries)
- `playedAt: Timestamp` (canonical audit/event time)

## Proposed Firestore Schema

### `users/{uid}`

- `displayName: string`
- `email: string`
- `photoURL?: string`
- `timezone: string`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`

### `puzzles/{puzzleId}` (shared catalog)

- `canonicalUrl: string`
- `host: string`
- `title: string`
- `description?: string`
- `iconUrl?: string`
- `socialImageUrl?: string`
- `tags: string[]`
- `createdBy: string` (uid)
- `createdAt: Timestamp`
- `updatedAt: Timestamp`

`puzzleId` should be deterministic from canonical URL (hash/slug) to reduce duplicates.

### `users/{uid}/subscriptions/{puzzleId}`

- `puzzleId: string`
- `isActive: boolean`
- `customTitle?: string`
- `customTags?: string[]`
- `sortOrder?: number`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`

### `users/{uid}/plays/{playId}`

- `puzzleId: string`
- `dayKey: number` (`YYYYMMDD`)
- `status: "unplayed" | "visited" | "completed" | "won" | "lost" | "skipped"`
- `visitedAt?: Timestamp`
- `completedAt?: Timestamp`
- `resultText?: string` (optional copied share text)
- `notes?: string`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`

`playId` convention: `${puzzleId}_${dayKey}` (enforces one record per puzzle/day).

## State Model Notes

- `visited`: user opened puzzle link from app
- `completed`: user confirms completion without win/loss detail
- `won` / `lost`: optional richer terminal states
- `skipped`: explicit "did not play"

Status transitions should be monotonic by default (no accidental downgrade), with explicit override actions if editing history.

## Metadata Strategy

Puzzle metadata sources (in order):

1. User-entered URL/title/tags
2. Lightweight client parse when same-origin allows
3. Optional server-side fetch/proxy function for Open Graph + favicon enrichment

Always allow manual edits because metadata quality varies.

## Query Patterns To Optimize

- User's active subscriptions (for dashboard list)
- User's today plays (`dayKey == today`)
- User's recent plays (`dayKey` range descending)
- Optional puzzle tag filters

Define indexes only as needed by actual query shapes.

## Security Rules Expectations

- Users can read/write only their own `users/{uid}` subtree.
- Shared `puzzles` catalog can be read broadly; writes limited to authenticated users with validation.
- Validate allowed `status` values and shape constraints in rules.

## Implementation Conventions

- Keep Firestore access in `src/lib/data/*` modules.
- Keep schema/types in `src/lib/model/*`.
- Keep auth/session state in `src/lib/auth/*`.
- Keep UI pages/components thin; business logic in stores/services.
- Prefer idempotent writes (`setDoc(..., { merge: true })`) when practical.
- For UI theming, treat foreground/background as a pair: when setting `bg` (or `--*-bg`), also set the matching `fg` (or `--*-fg`) in the same change to preserve contrast and accessibility.

## Workflow and Traceability

Agents should optimize for clear, auditable progress. Work should be easy to review and replay.

### PR Gate (Required)

Every PR should include:

- A clear Storybook story for each new or materially changed UI component/state.
- Clear TypeScript types for non-trivial logic/data changes (no implicit `any` drift).
- Automated tests where practical (unit/integration/component), plus explicit notes on any gaps.

### Branching

- Start work on a feature branch before making code changes when git is available.
- Branch naming convention: `feat/<area>-<short-description>` or `fix/<area>-<short-description>`.
- Keep one branch focused on one milestone/feature stream from `TODO.md`.

### Commit Discipline

- Make small, targeted commits mapped to completed TODO items or tightly related slices.
- Commit messages should be specific and outcome-based (example: `feat(auth): add google sign-in session store`).
- Do not bundle unrelated refactors with feature commits.
- If a task touches data model + UI + tests, prefer separate commits per layer when practical.

### TODO Tracking

- Update `TODO.md` checkboxes as work is completed.
- Keep task order meaningful; do not mark items done without code/tests in place.
- If scope changes, add or rewrite TODO items in the same branch so planning stays current.

### Testing Expectations

- For each functional change, run relevant checks before finishing.
- `npm run check` for type/svelte checks.
- `npm run test:unit -- --run` for logic/unit coverage where applicable.
- For UI component/state work, add or update Storybook stories demonstrating key states and interactions.
- For meaningful UI changes, verify Storybook build (`npm run build-storybook`) before handoff when feasible.

### Delivery Workflow (Default Order)

1. Confirm work is on a development branch.
2. Implement in small increments with clear commits as improvements land.
3. Before PR prep, request/collect user feedback on behavior/UI and close test gaps.
4. Prepare PR summary with test evidence, then push branch.

### Architecture Checkpoints

- Before major feature phases, confirm the current dev plan and component architecture still match scope.
- If architecture changes, update `AGENTS.md` and `TODO.md` in the same branch before deeper implementation.

### PR/Handoff Summary

- Report completed TODO items, key files changed, and tests run with pass/fail status.
- Include any known gaps, deferred tasks, or follow-up risks.
- Keep summaries concrete so another agent can continue without re-discovery.

## Immediate Milestones

1. Firebase wiring (config, auth, firestore init, env handling)
2. Typed domain model + conversion helpers
3. Data access layer for subscriptions/plays
4. Basic dashboard UI and status updates
5. Streak computation + polish

See `TODO.md` for the execution checklist.
