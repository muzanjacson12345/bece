# Cloudflare usage monitor — design and safety notes

**Status updated 19 November 2026:** The read-only usage Worker is deployed and serving 100% of its traffic. The Owner panel and its `/usage` URL are published on GitHub Pages from `main` (PR #26). The preflight and responsive UI checks passed. The full Owner-authenticated request still needs verification in an active Owner session; secret values are not readable back from Cloudflare. No D1 database was created by this release.

## Free-plan limits checked 18 November 2026

- Workers Free: 100,000 incoming Worker requests per account per day; resets at midnight UTC. Exceeding the allowance produces error 1027. A security-critical Worker should fail closed rather than bypass its checks.
- Workers Free: 50 subrequests per invocation. A subrequest is made by the Worker to another service, for example with Fetch or a Cloudflare binding. This is separate from the incoming request count.
- D1 Free (only if D1 is selected): 5 million rows read per day and 100,000 rows written per day.
- D1 Free storage: 5 GB total per account, with a 500 MB maximum for an individual database.
- Since 1 September 2026, D1 free-tier queries fail after the daily row-read or row-write quota is exceeded; stored data is not deleted. The limit resets at midnight UTC.

## Current implementation scope

The current Owner panel is an account-wide current-day summary with a manual refresh action. It does **not** yet provide daily/monthly history or a Bece Hub feature-by-feature breakdown. Those require verified historical queries and explicit feature identifiers on the Worker events; until those are in place, the dashboard labels the data as account-wide and does not fabricate a breakdown.

## What the Owner panel may report

1. Workers incoming requests from Cloudflare Workers Analytics (workersInvocationsAdaptive, sum.requests).
2. Workers subrequests as a separate diagnostic measure (sum.subrequests).
3. D1 rows read and written from D1 Analytics (d1AnalyticsAdaptiveGroups, sum.rowsRead, sum.rowsWritten).
4. D1 storage from D1 storage analytics (d1StorageAdaptiveGroups, databaseSizeBytes).
5. Last successful retrieval time and data freshness warning.

D1 query count (readQueries / writeQueries) is useful diagnostic information but is not the same as billable row-read / row-write counts. Show row counts for quota tracking.

Cloudflare analytics have reporting delays and coverage limitations. The dashboard must label the source and timestamp, handle missing or delayed metrics, and never substitute zero for missing data. Keep an explicit 'not connected' state until the endpoint returns valid data.

## Security design before live connection

- The Cloudflare API token must never be sent to the browser or stored in public source control.
- Query the GraphQL Analytics API from a server-side Worker using a least-privilege token with Account Analytics Read access, scoped to the intended Cloudflare account.
- The Owner panel must call a protected endpoint. It must not be sufficient to hide a UI tab; the endpoint must independently validate the Firebase identity and authoritative owner permission/session.
- Do not create a public metrics endpoint. Do not log or return the Cloudflare token.
- Avoid storing Cloudflare usage data in Firestore unless there is a clear need; short-lived cache or server-side response is preferable.
- If connection credentials are not available, keep the panel in 'not connected' mode.

## Gems backend decision

The existing Gems security document currently describes Firebase Cloud Functions + Firestore Admin SDK. That architecture should not be silently replaced by Cloudflare Workers + D1. First compare actual costs, free allowances, Firebase authentication validation, staff authorization, transactional currency/event requirements, and the existing Coin data path. Do not implement cross-database Coin deductions and Gem awards as if they were one atomic transaction.

## Release gates

- Keep the Gems domain modules and Worker source on `feature/gems-system-modules`; the Owner UI was released separately to `main` so the full development branch was not merged.
- Test the Owner panel at phone, tablet and desktop sizes.
- Pure parsing and calculation helpers are covered by unit tests for Workers requests/subrequests, D1 rows read/written, latest-per-database D1 storage, warning thresholds, missing/malformed data, stale timestamps, and UTC reset boundaries.
- The pure helper does not call Cloudflare or hold credentials. It is imported by the server-side Worker; the Owner UI calls the protected `/usage` endpoint.
- D1 storage is summed from the latest available sample per database; the age of the oldest of those latest samples is used as the combined snapshot timestamp so an old database sample is not hidden.
- Do not deploy the unfinished Gems wallet/event backend or change Firestore rules as part of this usage display. The read-only usage Worker is deployed; its authenticated live request still needs verification from an active Owner session.
## Official Cloudflare references

- Workers plan limits and daily reset/error behavior: https://developers.cloudflare.com/workers/platform/limits/
- Worker metrics, incoming request totals, subrequests, and analytics delay: https://developers.cloudflare.com/workers/observability/metrics-and-analytics/
- D1 Free pricing, daily row allowances, resets and over-limit behavior: https://developers.cloudflare.com/d1/platform/pricing/
- D1 account/database storage limits: https://developers.cloudflare.com/d1/platform/limits/
- D1 rows-read/rows-written and storage analytics, including GraphQL dataset names: https://developers.cloudflare.com/d1/observability/metrics-analytics/
- Cloudflare API token permissions (Account Analytics Read): https://developers.cloudflare.com/fundamentals/api/reference/permissions/
- D1 Free-tier daily limit enforcement (effective 1 September 2026): https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/