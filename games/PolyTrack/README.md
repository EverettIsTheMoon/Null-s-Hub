# PolyTrack 0.5.2 (Unofficial Build)

This repo contains the static assets for the PolyTrack 0.5.2 browser build (bundled `main.bundle.js`, worker, audio, tracks, etc.). The game expects to be hosted from one of the “official” domains baked into the bundle, so keep the deployment URL under `htmlunblockedgames.github.io` (or another host you’ve patched into the allow‑list).

---

## Local Development

1. Install Node 18+ (only needed for helper scripts/tests).
2. Run a static server at the repo root, e.g. `npx http-server .` or VS Code’s Live Server.
3. Open `http://localhost:<port>/` to load the game.

The bundle is already built; there is no separate build step.

---

## Deployment Checklist (GitHub Pages)

1. Push all assets to the `htmlunblockedgames.github.io/polytrack-0.5.2` path (or the host you control).
2. Ensure the Pages site serves from the repo root so `tracks/`, `audio/`, `models/`, etc. are reachable.
3. Because directory listings are disabled on GitHub Pages, always refresh the fallback track lists before deploying:

```bash
npm install        # first time only
npm run update-fallbacks
npm test           # optional but recommended
git commit && git push
```

`npm run update-fallbacks` rewrites the embedded `officialTrackFallbacks` / `communityTrackFallbacks` arrays so the game discovers any new `.track` files.

---

## Tracks Workflow

* Drop new `.track` files under `tracks/official/` or `tracks/community/`.
* Update the fallback arrays via `npm run update-fallbacks`.
* See `tracks/README.md` for a short reminder and deployment caveats.

---

## Automated Checks

`npm test` runs a custom smoke suite (`scripts/run-tests.js`) that verifies:

- Required bundles exist
- Track directories contain files
- Dynamic loader + custom track guards are present
- Leaderboard + host tweaks remain intact

Run it before every deploy to catch regressions without reopening the bundle.