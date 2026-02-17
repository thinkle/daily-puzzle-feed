# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright storybook --install npm .
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Firebase Metadata Endpoint

This project includes a Firebase Function called
`resolvePuzzleMetadata` in `functions/src/index.ts`. It fetches a URL,
extracts OG/Twitter/title/favicon metadata, and returns JSON used by
the puzzle submit prefill flow.

### Build and lint functions

```sh
cd functions
npm run lint
npm run build
```

### Run locally (emulator)

```sh
cd functions
npm run serve
```

Test with:

```sh
curl -s "http://127.0.0.1:5001/daily-puzzle-feed/us-central1/resolvePuzzleMetadata?url=https://www.nytimes.com/games/wordle/index.html"
```

### Deploy function

```sh
firebase deploy --only functions:resolvePuzzleMetadata --project daily-puzzle-feed
```

After deploy, set `PUBLIC_PUZZLE_METADATA_ENDPOINT` in `.env` to the
function URL and restart `npm run dev`.
