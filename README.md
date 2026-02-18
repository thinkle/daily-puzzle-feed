# Daily Puzzle Feed

Daily Puzzle Feed is a SvelteKit app for tracking daily puzzle links and statuses.

## Local setup

1. Install dependencies:
```sh
npm install
```
2. Copy env template and fill Firebase values:
```sh
cp .env.example .env
```
3. Start dev server:
```sh
npm run dev
```

## Required env vars

Set these in `.env`:

- `PUBLIC_FIREBASE_API_KEY`
- `PUBLIC_FIREBASE_AUTH_DOMAIN`
- `PUBLIC_FIREBASE_PROJECT_ID`
- `PUBLIC_FIREBASE_STORAGE_BUCKET`
- `PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `PUBLIC_FIREBASE_APP_ID`
- `PUBLIC_FIREBASE_MEASUREMENT_ID`
- `PUBLIC_PUZZLE_METADATA_ENDPOINT`
- `PUBLIC_ADMIN_EMAILS` (comma-separated emails for showing admin review UI)

## Puzzle submission workflow

1. Paste puzzle URL.
2. Click `Lookup URL`.
3. Review/edit title, description, tags, image/archive/unlimited fields.
4. Submit.

Behavior:

- If URL already exists in canonical `puzzles`, it is added directly to the user feed.
- Otherwise it is saved as `puzzle_submissions` with `pending` status.
- Admin users can approve/reject pending submissions.
- Approval writes/updates the canonical record in `puzzles`.

## Firebase function: metadata resolver

Function source: `functions/src/index.ts` (`resolvePuzzleMetadata`).

Deploy:
```sh
firebase deploy --only functions:resolvePuzzleMetadata --project daily-puzzle-feed
```

Test:
```sh
npm run test:metadata -- https://www.nytimes.com/games/wordle/index.html
```

## Firestore rules deployment

Deploy rules:
```sh
firebase deploy --only firestore:rules --project daily-puzzle-feed
```

Rules are currently configured to:

- Allow signed-in reads of canonical `puzzles`
- Allow authenticated creation of `puzzle_submissions`
- Restrict puzzle approvals/rejections and canonical puzzle writes to admin emails defined in `firestore.rules`

If your admin email changes, update both:

- `firestore.rules` admin email allowlist
- `PUBLIC_ADMIN_EMAILS` in your `.env`

## Quality checks

```sh
npm run check
npm run test:unit -- --run
npm run build-storybook
```
