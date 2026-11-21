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
