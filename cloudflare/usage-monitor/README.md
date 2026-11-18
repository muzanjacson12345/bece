# Bece Hub Cloudflare usage monitor

This directory contains a **read-only metrics Worker** for the Bece Hub Owner panel.

## Current status

- The code is on the development branch only.
- It has not been deployed to a Cloudflare account.
- No Cloudflare account, API token, account ID, or production origin has been connected.
- The Owner panel therefore remains in its explicit **Not connected** state.
- Do not paste API tokens or Owner passwords into GitHub source, issues, chat, or this repository.

## Authentication and authorization

1. The browser sends its Firebase Authentication ID token in the Authorization Bearer header.
2. The Worker validates the token with Firebase Authentication's accounts:lookup endpoint and obtains the UID from that verified response. It does not trust a UID supplied by the browser.
3. The Worker reads only ownerSessions/{verified UID} from Firestore REST using that same Firebase ID token. The existing rules permit a signed-in user to read only their own session record.
4. The Worker checks that the session record has the expected attestation fields and a timestamp within the app's 30-minute Owner session. It never returns or logs either password field.
5. The Worker performs a page-size-one read against the Owner-only auditLogs collection. The existing auditLogs rule calls isOwner(), which re-checks the current Owner passwords and session. This rejects an old session after either Owner password is changed.
6. Only after both checks succeed does the Worker request account-wide Cloudflare analytics.
7. The Cloudflare API token stays in the Worker secret store and is sent only to Cloudflare's GraphQL API.

Firebase documents that Firestore REST accepts Firebase Authentication ID tokens and applies Firestore Security Rules to those requests:
https://firebase.google.com/docs/firestore/use-rest-api

Firebase documents the Authentication accounts:lookup REST endpoint:
https://firebase.google.com/docs/reference/rest/auth#section-verify-custom-token

This depends on the existing Firestore rules continuing to allow a signed-in user to read only their own ownerSessions/{uid} record. Do not relax that rule.

## Cloudflare metrics

- Workers: account-wide requests and subrequests from workersInvocationsAdaptive.
- D1: rows read and written from d1AnalyticsAdaptiveGroups, when D1 is enabled.
- D1 storage: queried separately from d1StorageAdaptiveGroups, ordered by datetime descending. The shared parser selects the latest available sample per database and sums those samples once; it does not add historical samples together or select the largest historical size. The response includes the oldest timestamp among those latest per-database samples so the aggregate's age is visible.
- Quota percentages map to Owner warnings at 50%, 70%, 85%, and 95%. Values over the quota are marked exceeded; remaining use never goes negative.
- Cloudflare analytics are delayed and must be displayed with their source and latest update time. They are not a live billing meter.
- If results are incomplete, empty, malformed, or at the 10,000-row cap, the affected metric is unavailable instead of presenting a partial total as complete.

## Local tests

From this directory:

```sh
npm install
npm test
```

The tests use mocked Firebase, Firestore, and Cloudflare responses. They do not require real account credentials or make live external calls.

## Deployment setup — not performed

Do not deploy until the metrics tests pass, the actual website origin is confirmed, and a Cloudflare account holder is ready to configure the account.

Set the required values as Worker secrets (not source-code variables):

```sh
npx wrangler secret put APP_ORIGIN
npx wrangler secret put FIREBASE_API_KEY
npx wrangler secret put CF_ACCOUNT_ID
npx wrangler secret put CF_API_TOKEN
```

- APP_ORIGIN must be the exact app origin including protocol but no path, for example https://your-site.example. Do not guess it.
- FIREBASE_API_KEY is the public Firebase web API key for Bece Hub.
- CF_ACCOUNT_ID is the Cloudflare account containing the Worker(s) whose request totals you want to monitor.
- CF_API_TOKEN should be scoped to that account with only Account Analytics Read permission.

The Firebase project ID is the non-secret value already set in wrangler.jsonc.

Then deploy from this directory:

```sh
npx wrangler deploy
```

This will publish a Worker. It is deliberately not run by this development work.

## Important limitations

- A Firestore REST check proves the current caller can read their own valid Owner-session document under Firestore Security Rules. It is not a replacement for reviewing those rules.
- The metrics endpoint is read-only. It does not modify Coins, Gems, player balances, or event entries.
- D1 is optional: failure to retrieve D1 analytics does not suppress valid Worker request data.
- The D1 storage GraphQL query uses Cloudflare's documented d1StorageAdaptiveGroups dataset and databaseSizeBytes maximum. Its exact account schema and permissions still need a live-account check. Storage remains unavailable if the query is rejected.
- Worker account-wide groups are capped at 10,000 returned records. At the cap, the response marks the metric incomplete rather than reporting a false remaining quota.
