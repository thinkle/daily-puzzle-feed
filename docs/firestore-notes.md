# Firestore Notes

## Collections in current workflow

- `puzzles`: canonical approved puzzle catalog.
- `puzzle_submissions`: user-submitted URLs and metadata drafts pending review.
- `users/{uid}` subtree: reserved for per-user data (subscriptions/plays next).

## Query shapes implemented

- `puzzles where active == true limit N` (dashboard approved catalog load).
- `puzzle_submissions where status == "pending" limit N` (admin queue).
- `puzzles where canonicalUrlNormalized == url limit 1` (URL resolver dedupe).
- `puzzles where canonicalUrl == url limit 1` (URL resolver fallback).

## Index notes

No composite indexes are currently required by these query shapes.
`firestore.indexes.json` remains empty for now.

## Rules notes

Rules in `firestore.rules` currently enforce:

- signed-in reads for `puzzles`
- authenticated create/read-own for `puzzle_submissions`
- admin-only review/approval writes

Admin identity is email-based inside rules for now.
Longer-term, move to custom claims (`request.auth.token.admin == true`) when ready.
