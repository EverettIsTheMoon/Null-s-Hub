# PolyTrack 0.5.2 Legacy API (Kodub backend)

This document reverse-engineers the bundled 0.5.2 client (`main.bundle.js`) so you can stand up a drop-in replacement for the original Kodub API. All line references below point back to `main.bundle.js` for traceability.

## Runtime overview

- **Base URL** – Every request is sent to `https://vps.kodub.com/` (`vu`) and tagged with the current game version `bu` (`fu.rE + yu`, currently `0.5.2`; `main.bundle.js:24881-24890`).
- **Physics revision** – `fu.l$.M` (`Au`) captures the physics build number and is validated up-front (`main.bundle.js:24889-24892`). It is not sent to the API but explains why replay validation is strict.
- **Determinism gate** – The API client (`ZU`) refuses to hit mutating endpoints unless `determinismState === HT.Ok` (`main.bundle.js:44475-44483`, `37764-37776`). Determinism is established by running a local replay/asset self-test (`main.bundle.js:50510-50539`).
- **Timeouts & payload limits** – Every `XMLHttpRequest` is given a 20 s timeout (`qU`, `main.bundle.js:44474-44487`), and uploaded recordings must stay under 10 000 encoded bytes (`YU`, `main.bundle.js:44475-44477` + `44639-44647`).
- **Transport** – The client uses `GET` for read-only calls and `POST application/x-www-form-urlencoded` for writes. Responses are plain JSON (or empty bodies in a few cases).

## Identity, tokens, and supporting data

- **User token** – Profiles hold a 64-character lowercase hex token generated from random bytes and UUIDs, then hashed once with SHA‑256 (`AD.createToken`, `main.bundle.js:41022-41047`). The token is sent as `userToken` on every mutating request.
- **Token hash** – Whenever a proof of identity is needed for read-only calls, the client supplies `userTokenHash = sha256(userToken)` (`cD.tokenHash`, `main.bundle.js:40991-41003`). This is what `/leaderboard` uses to highlight “my run”.
- **Profiles** – Each profile tracks `{ token, nickname (<=50 chars), carColors }` (`main.bundle.js:40991-41066`). Names are validated client-side before calling the API (`main.bundle.js:44811-44831`).
- **Car colors** – `carColors` is a 24-character hex blob: four `#RRGGBB` values concatenated (primary, secondary, frame, rims). `tp.serialize/deserialize` handles this (`main.bundle.js:25327-25358`).
- **Recordings** – The `Lv` class records frame numbers where the five inputs (`up/right/down/left/reset`) toggle, deltas them, then deflates + URL-safe base64 encodes the byte stream (`main.bundle.js:28512-28636`). The server consumes the same codec (`Lv.maxFrames = 5,999,999` at `main.bundle.js:28658-28659`).
- **Verification flags** – Server responses reuse the `VT` enum (`0=Pending, 1=Verified, 2=Invalid, 3=InvalidDuplicate, 4=InvalidManual`, `main.bundle.js:37769-37776`).

## Endpoint reference

### `GET /leaderboard`

- **Request**: `https://vps.kodub.com/leaderboard?version={bu}&trackId={id}&skip={n}&amount={m}[&onlyVerified={bool}][&userTokenHash={sha256(token)}]` (`main.bundle.js:44479-44533`).
  - `trackId` is the internal track identifier (matches the folder/file id the client is playing).
  - `skip`/`amount` control pagination (the UI now always asks for the first 10, but the API still paginates).
  - `onlyVerified` is still supported even though the UI no longer exposes a toggle; pass `true`/`false` as literal strings.
  - `userTokenHash` only appears when determinism is OK so the server can return the caller’s relative position.
- **Response** (`main.bundle.js:44490-44557`):
  ```jsonc
  {
    "total": 123,                // safe integer
    "entries": [
      {
        "id": 456,               // leaderboard row id
        "userId": "hex...",      // string, compared to tokenHash for isSelf
        "name": "Player",
        "frames": 1234,          // <= Lv.maxFrames
        "carColors": "24 hex chars"
      },
      ...
    ],
    "userEntry": {               // present only if the server can locate the caller
      "position": 7,             // 0-based
      "frames": 1234,
      "id": 456
    }
  }
  ```
  The client immediately deserializes `carColors` and wraps `frames` in `Gp` (time formatter), so your replacement should preserve the same units (physics frames at 60 Hz).

### `POST /leaderboard`

- **Purpose**: Submit a new run (`main.bundle.js:44639-44690`).
- **Request body** (`application/x-www-form-urlencoded`):
  ```
  version={bu}
  &userToken={64 hex chars}
  &name={urlencoded nickname}
  &carColors={24 hex chars}
  &trackId={id}
  &frames={integer}
  &recording={Lv.serialize() string}
  [&onlyVerified=true|false]
  ```
  `recording` must serialize to <10 000 characters; otherwise the client aborts before the request is sent.
- **Response**:
  - Either a bare number / `null` meaning “uploadId with no position update”, or
  - An object with `uploadId`, `previousPosition`, and `newPosition` (each nullable safe integers). The client stores `uploadId` alongside the local ghost so it can sync later (`main.bundle.js:44658-44689`).

### `GET /recordings`

- **Request**: `https://vps.kodub.com/recordings?version={bu}&recordingIds=12,34,...` (`main.bundle.js:44575-44627`). Only allowed when determinism is `Ok`.
- **Response**: Array matching the order of `recordingIds`; each entry is either `null` or:
  ```jsonc
  {
    "recording": "<Lv.serialize()>",
    "verifiedState": 0-4,
    "frames": 1234,
    "carColors": "24 hex chars"
  }
  ```
  The client deserializes the replay, wraps `frames` in `Gp`, and deserializes `carColors` (`main.bundle.js:44598-44623`).

### `POST /verifyRecordings`

- **Purpose**: Pull work for verifiers and report past verdicts (`main.bundle.js:44735-44799`, `45534-45610`).
- **Request body**:
  ```
  version={bu}
  &userToken={verifier token}
  [&trackId={id}]                  // optional: restrict work to one track
  &maxFrames={int}                 // client preference for longest replay to fetch
  &getEstimatedRemaining={true|false}
  &recordings={JSON.stringify([{ "id":123, "verifiedState":VT.Verified }, ...])}
  ```
- **Response**:
  - Empty string ⇒ no work available (the client treats it as an exhaustive, zero-estimate batch).
  - Otherwise JSON `{ "exhaustive": 0|1, "estimatedRemaining": null|int, "unverifiedRecordings": [{ "id": n, "recording": "<Lv string>", "frames": int }] }`.
  - The client enforces all type checks shown in `main.bundle.js:44748-44786` and surfaces `403` as “User is not a verifier” (`main.bundle.js:44790-44791`).

### `GET /user`

- **Request**: `https://vps.kodub.com/user?version={bu}&userToken={token}` (`main.bundle.js:44801-44839`).
- **Response**: Either `null` (unknown token) or `{ "name": string, "carColors": "24 hex chars", "isVerifier": bool }`.
  - The client validates `name` length (1–50) and that `carColors` parses, so your replacement should match those expectations.

### `POST /user`

- **Purpose**: Save profile cosmetics (`main.bundle.js:44718-44733`).
- **Request body**:
  ```
  version={bu}
  &userToken={token}
  &name={nickname}
  &carColors={24 hex chars}
  ```
- **Response**: Empty 200 OK on success; anything else is treated as “Failed to connect to server”.

## Additional behaviors to preserve

- **Local replay sync** – After submitting, the game stores `{ uploadId, recording, frames }` per track. If your API changes the way uploadIds are issued, make sure `GET /recordings` can still resolve the ids the client caches (`main.bundle.js:42343-42437`).
- **Estimated remaining math** – The verifier UI expects `estimatedRemaining` to be a non-negative integer countdown linked to the track it most recently fetched (`main.bundle.js:45534-45610`). Returning `null` pauses the countdown until a future batch provides a real number.
- **Verification statuses** – The client sends `VT.Invalid` (2), `VT.InvalidDuplicate` (3), etc., depending on simulation results (`main.bundle.js:45584-45605`). Your backend should persist those exact codes to stay compatible with `GET /recordings`.
- **Host allow-list** – Although unrelated to the HTTP API, the build still distinguishes official vs. unofficial hosts when deciding whether to surface the “unofficial build” banner and whether leaderboard calls are permitted. If you deploy on a different domain, remember to update the host regexes (`main.bundle.js:37701-37745`) or keep the same canonical URLs.

Armed with the above, you can swap in your own infrastructure (GitHub Pages front-end + custom API) while keeping the client binary untouched. Mirror the request/response shapes verbatim and honour the determinism/timing constraints, and the game will treat your backend exactly like the original Kodub service.

## Call-site checklist (sanity re-check)

The code references `vu` exactly five times, all in the `ZU` service (`main.bundle.js` line numbers shown so you can cross-check quickly):

- `main.bundle.js:44479-44573` – `GET /leaderboard`
- `main.bundle.js:44575-44627` – `GET /recordings`
- `main.bundle.js:44639-44699` – `POST /leaderboard`
- `main.bundle.js:44718-44791` – `POST /user` and `POST /verifyRecordings`
- `main.bundle.js:44801-44839` – `GET /user`

There are no other `vu + …` concatenations in the bundle (`rg "vu \+" main.bundle.js` confirms this), so documenting the endpoints above covers every API touchpoint the shipped game uses.
