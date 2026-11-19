# BECE Hub secure Gems API

This Worker is deployed separately from `bece-hub-usage-monitor`. It verifies Firebase Authentication ID tokens, checks bans, and performs atomic Gems balance changes through the Firestore REST API using a service account stored only as a Cloudflare Worker secret.

## Runtime configuration

Add one encrypted Worker secret to the Cloudflare Worker named `bece-hub-gems-api`:

- Name: `GOOGLE_SERVICE_ACCOUNT_JSON`
- Value: the complete JSON key for a dedicated Google Cloud service account in project `bece-hub-d9ad5`.

The service account needs the **Cloud Datastore User** role on the Firebase project so it can read and update Firestore documents. Do not put the JSON key in GitHub, in the website source, or in ChatGPT. Do not send the key to anyone. Rotate/delete the key if it is ever exposed.

The Worker deliberately refuses all Gems earnings except requests authenticated as the Owner in `users/{uid}.role`. Player-initiated earning must remain disabled until the app has explicitly defined server-verifiable reward rules. Spending is limited to the signed-in player's own balance. No client-supplied UID or balance is accepted.

## Endpoints

- `GET /health`: reports whether the service account secret has been configured.
- `POST /gems`: accepts a Firebase ID token and `{ action, amount, operationId }`.

The Worker caps a single operation at 1,000,000 Gems, caps a balance at 1,000,000,000 Gems, keeps the last 100 operation IDs for replay protection, and rejects banned accounts.

## Deployment

The app uses `https://bece-hub-gems-api.abeikcrentsil.workers.dev/gems`. Keep that endpoint separate from the existing Cloudflare usage monitor.
