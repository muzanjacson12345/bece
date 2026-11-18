# Gems and Coins — security and integration design

## Why the wallet is separate
The current app stores player data in players/{uid}. The current player rules allow a signed-in user to update their own player document. Putting a trusted Gems balance in that same editable document would allow a user to try to award themselves Gems.

The new currency balances therefore belong in a separate wallets/{uid} document:
- coins: integer
- gems: integer
- updatedAt: server timestamp

The existing players/{uid} document remains the source for the current app profile until a reviewed migration is planned. Do not copy or reset existing Coin balances automatically.

## Trusted writes only
Firestore client rules must deny all client writes to wallets, currencyTransactions, gemEvents/{eventId}/participants, and event attempt records. Users may read only their own wallet and transaction history. Owner/Admin event management must use trusted server-side functions after verifying the current staff session and permissions.

The Firebase Admin SDK used by Cloud Functions bypasses Firestore client rules. Callable functions must independently validate authentication, ban status, event state, balance, entry/retry limits, and request idempotency.

## Entry/retry transaction
A trusted function should run one Firestore transaction that:
1. Validates the signed-in user and rejects banned users.
2. Loads the event, wallet, participant usage and idempotency record.
3. Checks event status and local start/end timestamps.
4. Checks the configured entry or event-wide retry limit.
5. Checks the Coin balance.
6. Deducts the exact configured Coin fee.
7. Increments the correct usage counter.
8. Creates an immutable attempt and transaction record.
9. Stores the idempotency result so a repeated request cannot charge twice.

A failed transaction must leave both the balance and counters unchanged.

## Event scoring
A paid retry must not increase a ranked user's ranked-attempt allowance. Ranked and practice attempts must be identified separately in the data. The event configuration must disclose which score is used for ranking.

## Gem rewards
Reward grants must be issued by trusted functions after verifying a unique achievement, qualifying activity or event result. Use a unique reward reference to prevent duplicate credits.

## Marketplace
Marketplace items are direct-purchase cosmetics only. The server verifies the current price, item status, item type and Gem balance in one transaction. Permanent ownership and consumable inventory are recorded separately. Do not create paid random-reward purchases.

## Migration and release gates
- Keep the current Coin system working during development.
- Inspect every existing Coin award and spending path before migrating balances.
- Do not let the client write a wallet balance or transaction record.
- Do not publish rules or deploy functions until emulator tests cover normal users, banned users, Owner/Admin permissions, duplicate requests, insufficient balances, event limits, retries and refunds.
- Deploy Cloud Functions and Firestore rules separately from the static website. Confirm each deployment independently.
