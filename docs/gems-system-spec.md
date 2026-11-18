# Gems and Special Events — agreed product specification

## Currency rules
- Coins remain the everyday currency and are used to purchase special-event entries and permitted retries.
- Gems are a separate reward currency. Users earn Gems through achievements, qualifying daily activity, and special events.
- Gems are not bought with Coins, exchanged for Coins, transferred between users, or allowed to expire.
- Gems are spent only on optional cosmetics and collectible items. They never buy learning advantages or essential study access.

## Special-event entry rules
Each event defines its own:
- Positive Coin entry fee.
- Maximum number of paid entries per user.
- Whether paid retries are enabled.
- Separate positive Coin retry fee.
- Maximum retry count per user for the entire event (not per entry).
- Start/end time, status, and optional participant cap.
- Gem rewards for participation, completion, and verified placements.

Before paying, users must see the entry fee, remaining entries, retry fee, remaining retries, and the maximum possible Coin cost.

Maximum possible Coin cost = entry fee × maximum entries + retry fee × maximum retries.

Entries and retries must be charged atomically. Duplicate requests must not create duplicate charges. A challenge that never successfully starts because of a verified technical failure must not consume an attempt. Event cancellation must have a clearly stated refund policy.

For ranked competitions, paid retries must not increase a user's ranked attempt allowance. Retry scoring policy must be disclosed in the event details. Non-ranked events may use the best valid retry result.

## Gem earning
- Achievement rewards are one-time and progress-based.
- Daily rewards require a qualifying learning activity; missing a day does not remove already-earned Gems.
- Event rewards are granted once per qualifying user and event, based on verified participation, completion, and results.

## Gem Marketplace
- The marketplace is mixed rather than cosmetic-only, with direct purchases, clearly displayed prices and descriptions.
- Permanent and consumable items are supported.
- Permanent items remain owned; consumables are used when activated or redeemed.
- Allowed non-academic item categories still need to be defined before marketplace validation or purchase logic is expanded. Gems must not buy academic advantages or essential study access.
- No paid mystery boxes or random-reward purchases.

## Community
- Both individual community participation rewards and shared community goals are supported.
- Community participation/contributions are optional.
- Contributions and group rewards are recorded and can only be processed once.

## Owner/Admin controls
- Owner has full control.
- Admin access is limited by assigned permissions.
- Event configuration, prices, limits, rewards, marketplace items, manual adjustments, and event status changes are audited.
- Users can inspect their own balances, purchases, entries, retries, and transaction history.

## Architecture and release
- Keep the existing static GitHub Pages app; no full framework migration is required.
- New Gems/Event functionality is implemented as small browser ES modules under js/gems/.
- Currency-changing operations must be enforced by trusted server logic or restrictive Firestore rules. Client-side checks are for user experience only and are not a security boundary.
- Do not publish or merge until Firestore rules and transaction processing are validated, existing Coins flows still work, and responsive tests pass.
