# Production Yatzy Design

## Objective

Turn the existing two-file Yatzy scorecard prototype into a production-ready, mobile-first full-stack application that can be deployed as one Railway web service with a Railway PostgreSQL database. The application must support complete local gameplay, durable recovery of an unfinished round, validated storage of completed games, game history, and all-time leaderboards without user accounts.

## Product scope

The application has four primary destinations:

1. **New game** — choose a mode, configure allowed options, and enter two to eight player names.
2. **Current game** — enter scores, inspect totals, undo or correct entries, and finish the round.
3. **Past games** — browse completed games and open a complete read-only scorecard.
4. **Leaderboard** — compare named players within a selected game mode.

The interface remains German-language, mobile-first, and based on the existing visual direction. It supports light and dark themes, keyboard navigation, visible focus states, accessible names for icon buttons, dialog semantics, focus management, and reduced-motion preferences.

Accounts, authentication, remote live multiplayer, social features, and administrative deletion tools are outside this version's scope.

## Game modes and scoring

All modes use actual eye totals. The upper section never uses the prototype's plus/minus representation.

### Standard

- Five dice.
- Upper categories: ones through sixes, scored as the matching dice total.
- Upper bonus: 35 points when the upper subtotal is at least 63.
- Lower categories: one pair, two pairs, three of a kind, four of a kind, full house, small straight, large straight, Yatzy, and chance.
- Small straight is 15, large straight is 20, and Yatzy is 50.

### Blitz

- Five dice.
- Categories: the complete upper section, Yatzy, and chance.
- Upper bonus: 35 points at 63.
- Yatzy is 50.

### Maxi Yatzy

- Six dice.
- Upper categories: ones through sixes.
- Upper bonus: 100 points when the upper subtotal is at least 84, corresponding to four of each face.
- Lower categories: one pair, two pairs, three pairs, three of a kind, four of a kind, five of a kind, tower (three plus three), full house, full straight, small straight, large straight, Yatzy, and chance.
- Full straight is 21 and Yatzy is 100. Small and large straights remain 15 and 20.

### Free rules

- Configurable from five through eight dice.
- Uses the Standard category set.
- The bonus target is configured as two through the selected dice count of every face. The numeric threshold is `target count × 21`.
- The upper bonus value is configurable from 0 through 100 in increments of 5, defaulting to 35.
- Yatzy is 50.

### Category validation

The player enters a finished category score, not individual dice. Zero is always accepted as a crossed-out category. Non-zero values are accepted only if they are a possible result for that category under the selected dice count and mode.

The shared rules engine generates possible count distributions for six-sided dice and calculates the score each category would produce. This avoids hand-maintained ranges and keeps browser and server validation consistent. The category rules use the highest qualifying group for pair and kind categories, distinct face values for multiple pairs, the required group shapes for full house and tower, exact required sequences for straights, and the sum of all dice for chance. Because individual dice are not entered, validation proves that a score is possible, not that it came from the player's physical roll.

## Turn and editing behavior

- Every player chooses any unfilled category during their own turn.
- After saving or crossing out a category, the turn advances to the next seat in fixed circular order.
- Undo restores the complete state before the latest entry, including active player.
- A correction mode allows an entered cell to be replaced after explicit confirmation. The correction does not change whose turn it is and is added to undo history.
- Leaving, restarting, or replacing an unfinished game requires confirmation.
- When all required cells are filled, tied highest totals are displayed as joint winners.

## Local persistence and offline failure behavior

The current game, setup preferences, theme, undo history, and unsent completed games are stored in versioned browser storage. State is saved after every relevant change. On startup, the user can resume or discard an unfinished game.

Completing a game immediately creates an immutable submission payload and queues it locally. The application attempts to submit queued games whenever it starts, regains network connectivity, or completes another game. A failed submission never blocks gameplay. A client-generated UUID makes submission idempotent so retries cannot create duplicate games.

## Server architecture

A single Node.js process runs an Express API and serves the Vite production build. Browser and API share one origin.

The server applies:

- strict JSON body size limits;
- schema validation for parameters and bodies;
- normalized and length-limited player names;
- security headers;
- per-IP write rate limiting;
- parameterized PostgreSQL queries;
- server-side recalculation of every subtotal, bonus, total, rank, and winner;
- graceful handling of database unavailability;
- structured request logging without storing secrets.

Player identity is name-based. Names are trimmed, internal whitespace is collapsed, Unicode is normalized with NFKC, and the comparison key is lowercase. `Timo`, `timo`, and `TIMO` therefore share leaderboard statistics, while the most recently submitted display spelling is shown.

## Data model

### `games`

- `id UUID PRIMARY KEY` — the client-generated idempotency key.
- `mode TEXT NOT NULL`.
- `config JSONB NOT NULL` — dice count, upper target, bonus value, and category version.
- `completed_at TIMESTAMPTZ NOT NULL` — client completion time bounded by server validation.
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.

### `game_players`

- `id BIGSERIAL PRIMARY KEY`.
- `game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE`.
- `seat SMALLINT NOT NULL`.
- `player_name TEXT NOT NULL`.
- `player_key TEXT NOT NULL`.
- `scores JSONB NOT NULL`.
- `upper_total INTEGER NOT NULL`.
- `bonus INTEGER NOT NULL`.
- `lower_total INTEGER NOT NULL`.
- `total INTEGER NOT NULL`.
- `rank SMALLINT NOT NULL`.
- Unique constraint on `(game_id, seat)`.

Indexes cover recent games, `(mode, total)`, and normalized player lookup. Database migrations are plain numbered SQL files and are applied transactionally at server startup through a migration ledger with a PostgreSQL advisory lock.

## API

- `GET /api/health` returns process and database readiness.
- `POST /api/games` validates and stores one completed game idempotently, returning the canonical recalculated game.
- `GET /api/games?limit=<n>&cursor=<value>` returns a bounded newest-first history page.
- `GET /api/games/:id` returns one complete scorecard or a structured not-found response.
- `GET /api/leaderboard?mode=<mode>&limit=<n>` returns one row per normalized player with display name, best score, games played, wins, and last played date. Rows sort by best score descending, then wins descending, then display name.

All API errors use `{ "error": { "code": string, "message": string } }`. Expected validation and not-found conditions use 4xx responses; unavailable persistence uses 503; unexpected failures use a generic 500 response.

## Frontend structure

The prototype is split into focused modules:

- app shell, routing state, navigation, and theme;
- setup and mode configuration;
- scorecard and turn controls;
- score entry and correction dialogs;
- finished-game result dialog;
- history list and game detail;
- leaderboard filters and table/cards;
- shared scoring and ranking engine;
- versioned local persistence and submission queue;
- typed API client.

The application avoids a routing dependency because it has four shallow views and no server-rendered pages. Browser history and shareable game-detail URLs are not required in this version.

## Railway delivery

The repository contains a complete Vite/React/Node project with an explicit Node.js engine floor, deterministic lockfile, production build, and `npm start`. The Express server binds to `0.0.0.0` and Railway's `PORT`, serves static assets, and falls back to the application entry point only for non-API requests.

`railway.json` defines the build and start commands plus `/api/health` as the healthcheck. The only required application variable is `DATABASE_URL`, supplied by a Railway PostgreSQL service. The application fails startup clearly if production database configuration is absent, while tests use repository fakes and isolated scoring logic.

## Verification strategy

- Unit tests cover category score generation, all four mode definitions, upper bonuses, totals, ties, and ranking.
- Reducer tests cover turn order, undo, correction, completion, and state restoration.
- Component tests cover setup validation, score entry, resume/discard, history states, leaderboard states, dialogs, and keyboard-accessible controls.
- API tests cover accepted games, recalculation, idempotency, malformed payloads, impossible scores, incomplete games, name normalization, pagination, and database failures through a repository interface.
- Migration tests verify ordered migration discovery and required schema statements.
- Final verification runs formatting/lint checks, the complete test suite, a production build, and a production server health request.

## Acceptance criteria

The product is accepted when all four modes can complete a valid multi-player game; reload recovery, undo, correction, ties, and local retry work; completed games appear in history and leaderboard data is aggregated by normalized player name; invalid client and API input is rejected; accessibility checks encoded in component tests pass; and Railway can build and start the application against PostgreSQL using only the documented configuration.
