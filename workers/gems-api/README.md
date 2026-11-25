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
- `POST /gems`: accepts a Firebase ID token and an operation payload.
  - `earn`: Owner-only Gem grants, with `{ action, amount, operationId }`.
  - `spend`: player-initiated deductions, with `{ action, amount, operationId }`.
  - `purchase`: server-priced cosmetic purchases, with `{ action: 'purchase', itemId: 'profile-ring-gold', operationId }`. The Worker sets the 50-Gem price itself and atomically deducts Gems, records ownership, and equips the ring.
  - `reset`: full self-service account-progress reset, with `{ action: 'reset', operationId: 'reset:<unique-id>' }`. The Worker atomically replaces the profile, clearing Gems, Gem history, cosmetic ownership, achievements, Coins, EXP, streaks, inventory and challenge progress while retaining the profile ID and display name.

The Worker caps ordinary operations at 1,000,000 Gems, caps a balance at 1,000,000,000 Gems, keeps the last 100 operation IDs for replay protection, and rejects banned accounts. Cosmetic item IDs and prices are defined on the Worker; the client cannot choose a purchase price.

## Deployment

The app uses `https://bece-hub-gems-api.abeikcrentsil.workers.dev/gems`. Keep that endpoint separate from the existing Cloudflare usage monitor.

## Bug-report GitHub integration

The existing BECE Hub app writes reports to Firestore collection bugReports.
The Worker adds a separate authenticated POST /bugs route for issue creation
and legacy migration. It uses the existing GOOGLE_SERVICE_ACCOUNT_JSON
binding to read and update Firestore, and a separate secret named
GITHUB_TOKEN to create issues in muzanjacson12345/bece.

Configure GITHUB_TOKEN as a Cloudflare Worker secret (never as a frontend
variable, repository file, or checked-in Wrangler value). Use a narrowly scoped
GitHub credential for this repository with Issues read/write permission and
repository metadata read permission. Do not paste the credential into chat or
commit it to GitHub.

The route accepts Firebase ID tokens in the Authorization: Bearer ... header:

- POST /bugs with action=syncOne and a reportId creates or reconciles one
  report issue. The report owner may sync their own report; staff can sync
  reports they are authorised to manage.
- POST /bugs with action=migrate and pageSize=10 migrates one Firestore page.
  This action is restricted to a live Owner session: the Worker checks
  ownerSessions/{uid}, the 30-minute timestamp, and both configured Owner
  password fields. Admin checks use the live two-hour adminSessions/{uid}
  record and either the appointed staffRoster entry or configured Admin PIN.
  The app's Owner tool walks the returned nextPageToken until all reports
  have been checked.

Issue bodies contain only anonymous tracking metadata (report reference,
category, app section, device/browser and original submission date). They do
not include the full description, player's display name, Firebase UID, or
screenshots. Because the repository is public, this tracking metadata is
public. Full report details and screenshots are stored in private Firestore
subcollection documents under
bugReports/{reportId}/attachments/screenshot; they are not uploaded to public
GitHub issues.

Before enabling the app integration, add the GITHUB_TOKEN secret to the
existing bece-hub-gems-api Worker and deploy this Worker version. Without
that secret the app still stores reports in Firestore, but GitHub sync returns
GITHUB_SYNC_NOT_CONFIGURED and reports remain pending.


### Screenshot privacy covers

The screenshot editor's Cover tool draws a fully opaque mask. When covers are
used, they are baked into both the unmarked and annotated JPEG copies before
the private Firestore attachment is written. The unmarked copy therefore does
not retain text hidden by a privacy cover.


### GitHub issue status sync

The authenticated POST /bugs action=syncStatus endpoint is restricted to live
Admin/Owner sessions. After a staff member changes the Firestore report status,
the app asks the Worker to update the linked GitHub Issue: open and fixing
remain open; done and wontfix close the Issue. The issue body keeps both the
original status recorded at migration/creation and a current status line.
A staff member can retry from the report card if GitHub is unavailable.
