# Bece Hub Cloudflare usage monitor

This directory contains a **read-only metrics Worker** for the Bece Hub Owner panel.

## Current deployment status — updated 19 November 2026

- The Worker is deployed as `bece-hub-usage-monitor` at `https://bece-hub-usage-monitor.abeikcrentsil.workers.dev/usage`.
- Cloudflare reports the active deployment at 100% traffic. The production build ran `npm test` followed by `npx wrangler deploy` from `cloudflare/usage-monitor`.
- The Cloudflare Builds integration tracks `feature/gems-system-modules`; automatic builds are disabled, so production changes require an intentional build.
- The Worker has the required secret bindings: `APP_ORIGIN`, `FIREBASE_API_KEY`, `CF_ACCOUNT_ID`, and `CF_API_TOKEN`. The plain-text `FIREBASE_PROJECT_ID` binding is `bece-hub-d9ad5`. Secret values are not readable back from Cloudflare and must never be copied into source control.
- The Owner usage panel has been isolated into the main branch and published through GitHub Pages (PR #26). The production preflight smoke check and responsive UI audit passed.
- The CORS preflight is verified. A full authenticated metrics request still needs a live Owner session to confirm the secret values and upstream Analytics permissions end to end.
- The existing Firestore rules were not changed. The Worker relies on the signed-in user's own `ownerSessions/{uid}` read and the Owner-only `auditLogs` rule.

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

## Deployment maintenance — Worker already deployed

The production Worker is built from the `feature/gems-system-modules` branch with root directory `cloudflare/usage-monitor`. Cloudflare Builds currently uses:

- Build command: `npm test`
- Deploy command: `npx wrangler deploy`
- Automatic builds: disabled
- Previews: enabled

For a deliberate Worker update, first run the tests, inspect the Cloudflare diff, then trigger a production build from the configured branch. Preserve the existing Cloudflare secret bindings. Do not add secrets to GitHub, issues, source files, or chat, and do not create a committed `.env.production` file.

The website's `bece-usage-api` meta value must continue to match the deployed Worker URL exactly, including `/usage`. The allowed app origin is `https://muzanjacson12345.github.io`.

To review or rotate a secret, do so privately in the Cloudflare dashboard. The binding names can be listed, but Cloudflare does not reveal the stored secret values. A successful browser preflight does not prove that Firebase authentication or the Cloudflare Analytics token works; verify those using the protected Owner refresh while signed in as the Owner.

No Firestore rules or Gems wallet/event functions are deployed by this usage-monitor release.

## Important limitations

- A Firestore REST check proves the current caller can read their own valid Owner-session document under Firestore Security Rules. It is not a replacement for reviewing those rules.
- The metrics endpoint is read-only. It does not modify Coins, Gems, player balances, or event entries.
- D1 is optional: failure to retrieve D1 analytics does not suppress valid Worker request data.
- The D1 storage GraphQL query uses Cloudflare's documented d1StorageAdaptiveGroups dataset and databaseSizeBytes maximum. Its exact account schema and permissions still need a live-account check. Storage remains unavailable if the query is rejected.
- Worker account-wide groups are capped at 10,000 returned records. At the cap, the response marks the metric incomplete rather than reporting a false remaining quota.
