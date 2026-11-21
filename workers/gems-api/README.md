# BECE Hub trusted economy API

This Worker is the trusted backend for BECE Hub's Coins, EXP, Gems, shop purchases, power-up use and 1v1 Duel rewards. It is separate from the `bece-hub-usage-monitor` Worker.

> **Draft / rollout warning:** This repository branch contains newer Worker and website code than the currently deployed production Gems API. The production Worker was last inspected at version 5 and did not contain the Shop, Second Chance, Duel or permanent Gem-receipt additions documented here. Do not publish the draft website or Firestore rules alone. A future rollout must deploy and verify the matching Worker first, then coordinate the website and rules changes.

## Runtime configuration

The Worker uses one encrypted Cloudflare Worker secret:

- Secret name: `GOOGLE_SERVICE_ACCOUNT_JSON`
- Project: `bece-hub-d9ad5`
- Account: a dedicated Google Cloud service account with the Cloud Datastore User role on the Firebase project.

The secret must remain in Cloudflare. Never commit the service-account JSON key, put it in website code, or share it in chat. Rotate the key if it is ever exposed.

Every protected request requires a valid Firebase Authentication ID token. The Worker checks `bans/{uid}` before processing requests. A missing, null, zero or invalid ban expiry is treated as a permanent ban; a valid future Unix-millisecond expiry is temporary.

Owner-only operations use the app's actual staff model: `staffRoster/{uid}`, `ownerSessions/{uid}` and `config/owner`. Do not use `users/{uid}.role` as the Owner authorization source.

## Endpoints

All POST endpoints require a Firebase ID token in the `Authorization: Bearer <token>` header. The API accepts requests from the configured BECE Hub GitHub Pages origin.

| Endpoint | Purpose |
|---|---|
| `GET /health` | Reports whether the Worker service-account secret is configured. It does not reveal the secret. |
| `POST /practice` | Verifies submitted question IDs and answers, then computes practice/daily quiz EXP, Coins, Gems, streaks, achievements and challenge progress server-side. Requires a UUID operation ID. |
| `POST /shop` | Purchases an allow-listed title or consumable at the fixed server catalog price. The browser cannot set the price, quantity or target UID. Uses a UUID purchase receipt. |
| `POST /powerups/use` | Consumes one supported power-up. Current use is Second Chance (`p50`) inside an active Duel. The server records the question index and validates idempotent retries. |
| `POST /duels/start` | Starts or resumes the signed-in participant's private Duel progress session. |
| `POST /duels/next` | Opens the server-timed clock for the expected question in the Duel sequence. |
| `POST /duels/answer` | Validates the selected answer against the server answer key and computes correctness, score and time. Requires a UUID answer operation ID. |
| `POST /duels/forfeit` | Records a participant leaving a Duel and triggers settlement. |
| `POST /duels/settle` | Calculates the final result and eligible Coin rewards for both participants, then writes a permanent settlement receipt. |
| `POST /events/configure` | Owner-only operation that creates or edits an event's draft pricing/entry/retry configuration. It never activates an event and locks the fee/limit settings after the first paid entry. |
| `POST /events/enter` | Charges the event's configured entry Coin fee, enforces the player's entry allowance, creates a private attempt and records a permanent receipt. |
| `POST /events/retry` | Charges the event's configured retry Coin fee, enforces the per-entry retry cap, marks the previous attempt replaced and creates a new attempt. |
| `POST /events/next` | Starts or resumes the next question in a participant's paid attempt without resetting an existing server start time. |
| `POST /events/answer` | Verifies the answer with the private question-key module, advances the attempt, and updates the player's best leaderboard score when complete. |
| `POST /gems` | Performs an authenticated Gem earn/spend operation. Spending affects only the signed-in player's balance; granting Gems requires a valid Owner session. |

## Idempotency and server-owned records

The Worker uses permanent, private Firestore receipts so a network retry cannot award the same operation twice:

- `rewardOperations/{uid}_{operationId}` for practice rewards.
- `shopOperations/{uid}_{operationId}` for purchases.
- `powerupOperations/{uid}_{operationId}` for consumable use.
- `duelProgress/{duelCode}_{uid}` for each participant's trusted answer history and timing.
- `duelSettlements/{duelCode}` for the final Duel settlement.
- `gemEventOperations/{uid}_{operationId}` for event entry and retry payments.
- `gemEventAnswerOperations/{uid}_{operationId}` for individual event answer submissions.
- `gemTransactions/{uid}_{operationId}` for manual Gem balance changes.

Client Firestore rules deny access to private receipts and server-owned Duel progress. The Worker remains responsible for validating the participant, answer order, balances, daily Duel reward cap and duplicate-operation IDs.

## Economy rules currently enforced by the draft

- Shop prices come from the server catalog; a client-supplied price is ignored.
- Second Chance use is limited to two per Duel and one use per question. A retry receipt is valid only for the same player, power-up, Duel and still-current question.
- Duel scores and Coins are computed by the Worker, not accepted from browser-supplied totals, streaks or reward amounts.
- Duel Coin rewards retain the existing base rewards and verified bonuses, with a limit of ten rewarded Duels per player per UTC day.
- Gem transactions have a permanent receipt in addition to the short rolling `players.gemOps` list.
- Shop pause bypass is granted only to an authenticated active Owner session.
- Player-created profile data and ordinary profile edits cannot directly change Coins, EXP, streaks, Duel results, Gems, inventory or practice reward progress.

The supported balance ceiling is 1,000,000,000 units. A single `/gems` operation is capped at 1,000,000 Gems. Invalid balances fail closed and require review.

## Event entry and retry foundation

The draft Worker now has transactional payment endpoints for event entry and retries. These endpoints use per-event configuration from `gemEvents/{eventId}`; the browser cannot supply a price, balance, entry allowance or retry allowance. An Owner-only `/events/configure` endpoint creates or updates those settings as an inactive draft. The form cannot activate an event.

Required event fields:

- `status: "active"`
- `entryCostCoins`: positive integer Coin fee for each paid entry.
- `maxEntriesPerUser`: maximum number of paid entries a player may make for this event.
- `retryEnabled`: whether a paid retry is available.
- When retries are enabled: `retryCostCoins` and `maxRetriesPerEntry`.
- Optional `opensAt` and `closesAt`: Unix-millisecond event window boundaries.

The backend has technical safety ceilings of 100 entries per user and 20 retries per entry; an event's configured limits may be lower. Entry and retry charges are atomic with the participant/attempt updates and a permanent `gemEventOperations` receipt. Reusing an operation ID cannot charge twice. A retry creates a new attempt under the same paid entry and marks the previous attempt as replaced. Entry and retry payments only deduct Coins; they do not award Gems or achievements. Event opening and closing times gate new entries and paid retries. Once an attempt has been paid for, its player may finish it after the event closes; closed events remain visible so existing attempts and leaderboards can still be reached.

The draft website now includes an Events screen. Signed-in players can view active events, enter with the configured Coin fee, resume an attempt, submit answers, pay for a capped retry after completing an attempt, and read the public leaderboard. The Worker chooses each question from the Owner-configured question list and verifies every answer against the private BECE answer-key module. Answer submissions use permanent receipts, and the leaderboard retains each player's best score (correct answers first, fastest time as the tie-breaker). A lost network response can be retried with the same answer operation ID. A player cannot pay for another entry while their latest attempt is still ready or in progress.

**Still not complete:** no Owner activation control or event gameplay management screen exists yet. No Gem prize tiers or winner payout rules have been configured, so the event flow does not distribute Gems or award achievements. The Owner panel can create or edit inactive pricing/question drafts, but cannot activate an event. Keep events inactive until the prize/tie policy and Owner activation controls are completed. Do not treat achievement Gem rules as event prize rules.

## Related services

The Owner's infrastructure usage card uses the separate `bece-hub-usage-monitor` Worker at:

`https://bece-hub-usage-monitor.abeikcrentsil.workers.dev/usage`

That service measures account-wide Cloudflare usage. It is not the Gems API and should not be replaced by this Worker.
