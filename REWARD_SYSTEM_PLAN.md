# BECE Hub reward system plan

**Status: policy agreed for implementation; not live yet.** This document is on the draft branch. It does not mean production Firestore rules or the app have been changed.

## Currency roles

- **Coins** are the everyday spendable currency. Daily challenge completion awards Coins. Existing Coins from correct answers and streak bonuses remain separate rewards unless a later economy review changes them.
- **EXP** measures learning progress and contributes to level, leaderboard and streak progression. Daily challenges award bonus EXP.
- **Gems** are the rarer achievement currency. Gems are awarded only when an achievement is first unlocked. Replaying a quiz or refreshing the page must never award the same achievement Gems twice.

## Daily challenges

The existing design selects three missions per day from a larger pool. The existing XP scale is retained:

`XP = 12 + min(24, ceil(target × 1.5))`

The new explicit per-mission Coin reward is:

`Coins = max(1, floor(XP ÷ 4))`

This gives the student a visible pair of rewards for each completed mission. Existing per-correct-answer Coins and the streak bonus remain separate from challenge rewards.

Only normal practice sessions advance daily missions; the existing exclusion of Daily Quiz sessions is retained. A mission reward is credited once when the mission is completed. The mission set continues to reset each day.

## Achievements

The current Achievement Hall contains 44 milestones across:
- question milestones
- accuracy milestones
- quiz milestones
- subject exploration
- perfect quizzes
- study streaks

The Worker reward policy now assigns a positive Gem amount to each of the 44 existing achievement IDs. The range is 3–35 Gems, with larger milestone rewards for harder achievements. Achievements award Gems automatically on first unlock; the server stores a permanent claim record and rejects duplicates.

## Events and retries

Keep the earlier event design separate from achievement rewards:
- Coins are required to enter events.
- Each event defines its own entry allowance and entry price.
- Some events may charge Coins again for a retry.
- Every event has a configured retry limit; retries cannot be unlimited.
- An event retry must not grant an achievement or Gems merely for paying the retry cost.

## Security and migration order

1. Keep the current production Firestore rules unchanged while the app and Worker are being updated.
2. Move quiz-result verification, daily challenge progress, EXP/Coins awards and achievement unlocks into the trusted Worker. The browser must not send an amount to award or declare its own achievement unlocked.
3. Validate submitted question IDs and answers on the server before awarding progress. Use stable operation IDs and permanent server-side achievement claim records to prevent replay/double payment.
4. Protect reward and progress fields in Firestore rules only after the corresponding app flows call the Worker successfully and the emulator tests pass.
5. Do not copy legacy balances into a new wallet collection until an idempotent migration and the app's read/write cutover are prepared. There must be one source of truth for each balance.

## Firestore publishing gate

**Do not publish the draft rules yet.** I will explicitly tell the user when the app/Worker changes and tests are ready. At that point I must ask whether the rules have actually been updated and wait for their confirmation; I must not assume that a prior instruction or a link click means publishing is complete.

## Draft implementation status — 21 November 2026

The following security and economy work has been implemented on this draft branch and is covered by the current Worker and Firestore Emulator test suites:

- Practice and daily quiz answers are checked by the trusted Worker before EXP, Coins, streak progress, challenge progress or achievement Gems are credited.
- Shop purchases use the fixed server-side catalog and permanent purchase receipts.
- Second Chance consumption is server-authorized, limited per Duel and protected by receipts bound to the player, Duel and current question.
- Duel answers, timing, scores, forfeits, daily reward caps and final Coin settlement are calculated by the Worker. Clients cannot write their own Duel score or Coin reward.
- Normal player clients cannot edit Coins, EXP, streaks, Duel results, Gems, inventory or server-managed practice progress. Owner and Admin correction rights remain separately scoped and tested.
- Manual Gem changes use permanent transaction receipts.
- The Firestore test toolchain pins a patched `@grpc/grpc-js` release; CI runs an advisory check as well as Worker syntax, inline application syntax and Firestore Emulator tests.

The Owner infrastructure card already shows Worker requests used, the daily limit, requests remaining, percentage used and data freshness when the Owner refreshes it. The readings are account-wide; a Bece Hub feature-by-feature usage breakdown and monthly history are not connected yet.

### Event implementation status

The event lifecycle is now implemented on the draft branch:

- The Owner can save and edit inactive drafts with a subject or mixed-subject selection, 3–50 question IDs, entry and retry Coin fees/limits, opening/closing times, and configurable first/second/third-place Gem prizes.
- The Owner has an explicit activation control. The Worker checks the active Owner session, requires a future closing time and a valid question/prize configuration, then locks the event settings.
- Players can enter with Coins, resume attempts, answer questions verified against the private question-key module, pay for capped retries after finishing an attempt and read the leaderboard.
- Entry, retry, answer and prize operations are transactional and use private permanent receipts. The Worker maintains the number of open paid attempts.
- Ranking is correct answers descending, total answer time ascending, completion time ascending, then UID for a deterministic final tie-break.
- The combined top-three prize pool is capped at 1,000,000 Gems. Settlement pays only eligible places and happens once, in the same transaction that marks the event settled.
- Players have 24 hours after closing to finish paid attempts. New entries and retries stop at closing; unfinished attempts expire after the grace period and do not qualify for prizes.
- A 15-minute Cloudflare Cron trigger automatically scans for events ready to settle, up to five per run. The player Events screen can also safely trigger settlement for an overdue event. The Owner management card lists saved drafts, active events and settled events, shows entry/open-attempt counts and prize amounts, and can close an active event early while preserving the paid-attempt grace period.

The event flow is implemented but remains on the draft branch until its current CI run passes and the matching Worker, website and Firestore rules are rolled out together. No event has been activated and no Gem prizes have been paid in production.

### Publishing boundary

This work is draft-only. Production Firestore rules, the GitHub Pages site and the live Gems Worker have not been updated by this draft implementation. At the last inspection, the live `bece-hub-gems-api` was still version 5 and did not contain the new Shop, power-up, Duel, permanent Gem-receipt or event entry/retry endpoints.

A production rollout must be coordinated: deploy and verify the matching trusted Worker first, then publish the compatible website and Firestore rules. Never publish only one part of that set.
