# Daily Puzzle Feed TODO

## Active Sprint: Firebase Foundation (Now)

- [x] Create development branch for sprint work (`feat/firebase-foundation`)
- [x] Add Firebase SDK dependency and verify project still type-checks
- [x] Add Firebase client bootstrap (`src/lib/firebase/client.ts`)
- [x] Add env template (`.env.example`) with required Firebase public keys
- [x] Add auth session store/helpers (`src/lib/auth/session.ts`)
- [x] Add sign-in/sign-out controls in `src/routes/+page.svelte`
- [x] Add or update Storybook story for auth/header UI states
- [x] Run checks/tests and record results in handoff summary

## Active Sprint: Feed Builder (Now)

- [x] Define typed puzzle model with archive/unlimited metadata
- [x] Replace seed catalog usage with Firestore-backed approved puzzle loading
- [x] Build URL-first puzzle submission flow (lookup -> confirm -> submit)
- [x] Add admin review UI for approve/reject of pending submissions
- [x] Add Storybook coverage for feed-builder and admin review components

## Phase 0: Project Guardrails

- [x] Expand `AGENTS.md` with architecture, schema, and conventions
- [x] Add `docs/` notes for Firestore rules and index decisions as they evolve

## Phase 1: Firebase Foundation

- [x] Install Firebase SDK (`firebase`)
- [x] Create `src/lib/firebase/client.ts` for app/auth/firestore initialization
- [x] Add environment variables for Firebase config in `.env.example`
- [x] Implement auth helpers in `src/lib/auth/session.ts`
- [x] Add sign-in/sign-out UI controls on `src/routes/+page.svelte`

## Phase 2: Typed Data Model

- [x] Add shared types in `src/lib/model/puzzle.ts`
- [ ] Add shared types in `src/lib/model/play.ts`
- [ ] Add shared types in `src/lib/model/user.ts`
- [ ] Add date helpers (`dayKey` conversions) in `src/lib/model/date.ts`
- [ ] Add runtime validation guards for persisted status values

## Phase 3: Firestore Data Layer

- [ ] `src/lib/data/puzzles.ts`: create/get/list puzzles
- [ ] `src/lib/data/subscriptions.ts`: subscribe/unsubscribe/reorder
- [ ] `src/lib/data/plays.ts`: upsert daily play status by `{puzzleId}_{dayKey}`
- [ ] `src/lib/data/feed.ts`: query today's feed + recent history
- [ ] Ensure all functions are user-scoped and typed

## Phase 4: Core UI

- [ ] Replace page sketch with dashboard sections:
- [x] Today list skeleton with signed-in feed builder section
- [ ] Quick actions (`Open`, `Mark Completed`, `Mark Won`, `Mark Lost`, `Skip`)
- [x] Add custom puzzle form (URL, title, tags)
- [ ] Recent history panel (last 7-30 days)
- [x] Empty state + loading states

## Phase 5: Metadata Enrichment

- [x] Attempt favicon + OG metadata extraction path
- [x] Fall back to manual title/icon input
- [ ] Cache resolved metadata in `puzzles/{puzzleId}`
- [ ] Decide if Cloud Function proxy is needed for CORS-restricted sites

## Phase 6: Streaks and Insights

- [ ] Define streak rules (completed-only vs won/lost-inclusive)
- [ ] Implement streak calculator using ordered `dayKey` records
- [ ] Add small streak UI (current streak, best streak)

## Phase 7: Security and Quality

- [x] Add Firestore security rules for user-owned writes and status validation
- [ ] Add Firestore index definitions for feed queries
- [ ] Add unit tests for date + status transition helpers
- [ ] Add a smoke test for auth + create puzzle + mark status flow

## Phase 8: Release Readiness

- [ ] Production env setup for Firebase project
- [ ] Basic error logging/reporting strategy
- [ ] Deploy preview and verify mobile + desktop UX
