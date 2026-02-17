# Daily Puzzle Feed TODO

## Phase 0: Project Guardrails

- [x] Expand `AGENTS.md` with architecture, schema, and conventions
- [ ] Add `docs/` notes for Firestore rules and index decisions as they evolve

## Phase 1: Firebase Foundation

- [ ] Install Firebase SDK (`firebase`)
- [ ] Create `src/lib/firebase/client.ts` for app/auth/firestore initialization
- [ ] Add environment variables for Firebase config in `.env.example`
- [ ] Implement auth helpers in `src/lib/auth/session.ts`
- [ ] Add sign-in/sign-out UI controls on `src/routes/+page.svelte`

## Phase 2: Typed Data Model

- [ ] Add shared types in `src/lib/model/puzzle.ts`
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
- [ ] Today list (active puzzles + current status)
- [ ] Quick actions (`Open`, `Mark Completed`, `Mark Won`, `Mark Lost`, `Skip`)
- [ ] Add custom puzzle form (URL, title, tags)
- [ ] Recent history panel (last 7-30 days)
- [ ] Empty state + loading states

## Phase 5: Metadata Enrichment

- [ ] Attempt favicon + OG metadata extraction path
- [ ] Fall back to manual title/icon input
- [ ] Cache resolved metadata in `puzzles/{puzzleId}`
- [ ] Decide if Cloud Function proxy is needed for CORS-restricted sites

## Phase 6: Streaks and Insights

- [ ] Define streak rules (completed-only vs won/lost-inclusive)
- [ ] Implement streak calculator using ordered `dayKey` records
- [ ] Add small streak UI (current streak, best streak)

## Phase 7: Security and Quality

- [ ] Add Firestore security rules for user-owned writes and status validation
- [ ] Add Firestore index definitions for feed queries
- [ ] Add unit tests for date + status transition helpers
- [ ] Add a smoke test for auth + create puzzle + mark status flow

## Phase 8: Release Readiness

- [ ] Production env setup for Firebase project
- [ ] Basic error logging/reporting strategy
- [ ] Deploy preview and verify mobile + desktop UX
