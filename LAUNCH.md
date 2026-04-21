# Ordre — launch checklist

What's live and what's still manual. Rules + functions + hosting are
deployed as of April 2026; everything below is either a verification
step the user still owes, or a one-off console toggle.

---

## Status snapshot

### ✓ Already done

- Rules (Firestore + Storage + indexes) deployed.
- Functions deployed on **Node.js 22 (2nd Gen)** with `firebase-functions@^7.2.5`:
  - `createProject` (europe-west1) — server-side project-count quota.
  - `sendProjectInvite` (europe-west1) — App Check enforced, invite rate-limit.
  - `onStorageObjectFinalized` / `onStorageObjectDeleted` (**us-east1**, matching the default bucket region) — maintains `projects/{id}.storageBytesUsed`.
- Hosting bundle deployed to <https://ordre-app-41c95.web.app> with the App Check site key baked in, the landing redesign, SEO/ASO infra, Terms + Privacy pages, cookie consent banner.
- Artifact cleanup policies set for both function regions (1-day image retention) — stops GCR storage costs from creeping.
- PostHog EU project API key captured in `.env.local`.
- Firebase App Check reCAPTCHA v3 site key registered and baked into the prod bundle — the client attaches tokens on every request.

### ⚠️ Still to do (in order)

1. **Flip App Check enforcement on** (manual, console) — Section 2a below.
2. **Add PostHog key to prod build env** if you deploy from somewhere other than this laptop (e.g. CI).
3. **Smoke-test the live site** — Section 5.
4. **Custom domain `ordre.app`** — Section 2d.
5. **OG image asset** — Section 5e.

---

## 1. Third-party services

### 1a. PostHog (EU cloud) — DONE

Key is in `.env.local` as `VITE_POSTHOG_KEY=phc_…`. Keep this file out of
git; add the same key to any other environment that builds the prod bundle.

If you ever need to re-issue the key: <https://eu.posthog.com/> → the
Ordre project → Project settings → Project API Key → **Rotate**.

Recommended settings to verify (Project settings → General):
- Autocapture: on.
- Record user sessions: on (session replay for support cases).
- Exceptions → Enable exception capture: on (this is our Sentry replacement).

### 1b. Sentry

N/A — removed from the stack. PostHog captures exceptions.

### 1c. Stripe

Deferred. `VITE_BILLING_ENABLED` stays unset; the Pro upgrade CTA is
hidden; Pro access is granted with `npm run grant-pro -- <uid>`.

The zombie `createCheckoutSession` function from earlier scaffolding
has been deleted — the slate is clean for when Stripe wiring starts.

---

## 2. Firebase console setup

All steps at <https://console.firebase.google.com/project/ordre-app-41c95>.

### 2a. App Check enforcement — STILL MANUAL

The reCAPTCHA v3 site key is registered and the client sends tokens.
What's not yet done: flip **Enforce** on for each service. Until you do,
the rules/services will accept both tokened and untokened requests.

1. **Build → App Check → APIs**.
2. Turn **Enforce** on for:
   - Cloud Firestore
   - Cloud Storage
   - Cloud Functions
3. Wait ~5 min for propagation.

**Before flipping**: watch the "Verified requests" percentage on that page
sit at ≥95% for an hour. Our deployed clients send tokens, so it should
be high immediately. Low percentage = a client on a stale bundle; reload.

### 2b. Local dev with App Check

For local builds against the prod project:

1. `.env.local` → set `VITE_APP_CHECK_DEBUG=true` once and reload.
2. DevTools console prints a debug token.
3. Firebase console → App Check → Apps → Manage debug tokens → paste, label "local-dev".
4. Swap `.env.local` to `VITE_APP_CHECK_DEBUG_TOKEN=<paste>` so the token persists across reloads.

### 2c. Function secrets — pre-existing

`sendProjectInvite` uses two runtime secrets — both set from earlier work:

```bash
firebase functions:secrets:access EMAIL_PASS
firebase functions:secrets:access APP_BASE_URL
```

Rotate with `firebase functions:secrets:set <NAME>` when needed.

### 2d. Custom domain — STILL MANUAL

1. **Hosting → Add custom domain → `ordre.app`**.
2. Add the TXT + A records Firebase shows at your registrar.
3. After verification, add `www.ordre.app` as a redirect.

---

## 3. Environment variables

Present in local `.env.local`:

| Key | Status | Notes |
|---|---|---|
| `VITE_FIREBASE_API_KEY` + the other `VITE_FIREBASE_*` basics | ✓ | Web SDK bootstrap. |
| `VITE_FIREBASE_MEASUREMENT_ID` | ✓ | GA4. |
| `VITE_FIREBASE_APP_CHECK_SITE_KEY` | ✓ | reCAPTCHA v3 site key. |
| `VITE_POSTHOG_KEY` | ✓ | `phc_…`. |
| `VITE_POSTHOG_HOST` | — | Optional; defaults to `https://eu.i.posthog.com`. |
| `VITE_APP_CHECK_DEBUG_TOKEN` | — | Optional; local-only. |
| `VITE_BILLING_ENABLED` | — | Unset → Pro upgrade CTA hidden. |

Same vars need to exist in whatever env rebuilds `dist/` for prod
(GitHub Actions secret store, hosting CI, etc.). The `.github/workflows/ci.yml`
job uses throwaway placeholders only for its `npm run build` sanity check.

---

## 4. Redeploying

For future changes:

```bash
# Rules only — safe, no build.
firebase deploy --only firestore:rules,firestore:indexes,storage:rules

# Functions only — runs the tsc predeploy + uploads.
firebase deploy --only functions

# Hosting — build locally first so the bundle carries current env vars.
npm run build && firebase deploy --only hosting

# Everything at once.
npm run build && firebase deploy
```

Things learned during the first deploy, worth preserving:

- **Storage triggers must live in the bucket's region.** The default
  Firebase Storage bucket is `us-east1`, so `onStorageObjectFinalized` /
  `onStorageObjectDeleted` must specify `{ region: 'us-east1' }`. The
  callable functions (`sendProjectInvite`, `createProject`) stay in
  `europe-west1`. Mixing regions is fine.
- **Runtime is pinned in `firebase.json`**, not just `engines.node`.
  Both must match. Bump both when upgrading Node.
- **Eventarc needs Storage permissions.** First deploy failed with
  *"Permission 'storage.buckets.get' denied on ... Eventarc service
  account"*. Granting the Eventarc SA `roles/storage.admin` (or at minimum
  `roles/storage.objectViewer` + bucket-level `get`) fixes it. Done.
- **`firebase deploy` skips unchanged sources.** If you change only
  `firebase.json` (e.g. the runtime) and no source file, the CLI will skip.
  Touch a source file (a comment is enough) to force a re-upload.

---

## 5. Post-deploy verification — PENDING

Run these once, after flipping App Check enforcement.

### 5a. App Check is enforcing

Firebase console → App Check → APIs tab. "Requests in last hour" for
each service should show ≥95% **verified** within 10 min of enforcement.
If not, there's a client somewhere shipping without a token.

### 5b. Analytics wiring

1. Fresh incognito window → `https://ordre-app-41c95.web.app`.
2. Accept the cookie banner.
3. PostHog → Live events → should see `$pageview` within 10 s. Sign in;
   subsequent events should carry your `uid` as distinct ID.
4. Firebase console → Analytics → Realtime → 1 active user.

### 5c. Error capture

In DevTools console on the live site:

```js
throw new Error('launch-smoke-test');
```

Within ~60 s: PostHog → Exceptions → the event appears.

### 5d. Lighthouse

```bash
npx lighthouse https://ordre-app-41c95.web.app/ \
  --only-categories=performance,accessibility,seo,best-practices
```

Target ≥90 Performance, ≥95 the rest. If Performance misses, check:

```bash
curl -I https://ordre-app-41c95.web.app/assets/index-*.js | grep -i cache-control
# expect: cache-control: public, max-age=31536000, immutable
```

### 5e. OG / Twitter card preview

- <https://www.opengraph.xyz/url/https%3A%2F%2Fordre-app-41c95.web.app>
- <https://cards-dev.twitter.com/validator>

If the OG image 404s: create `public/og-image.png` (1200×630, monochrome,
Ordre mark + tagline), rebuild, redeploy, re-check.

### 5f. Storage-quota trigger round-trip

1. Sign in, create a project, upload a small PDF to a PO.
2. Firestore console → `projects/{id}` → `storageBytesUsed` should
   increment by the file size within ~30 s.
3. Delete the invoice → counter decrements back.

### 5g. Callables work end-to-end

- Create a 2nd project while on the free tier → should be blocked with
  "Free tier is limited to one project" (`createProject` quota guard).
- Invite a teammate → triggers `sendProjectInvite`; verify the email
  lands. Eleven more invites in the same hour → the 11th should fail
  with `resource-exhausted` (rate limit).

---

## 6. Operating playbook

### Granting Pro access manually

```bash
npm run grant-pro -- --email=user@example.com           # grant annual
npm run grant-pro -- <uid> --plan=monthly              # grant monthly
npm run grant-pro -- <uid> --revoke                    # revoke
```

Requires `firebase-admin-key.json` at repo root and
`FIREBASE_ADMIN_KEY_PATH` in `.env.local`.

### Rotating the reCAPTCHA key

1. Create a new key in the reCAPTCHA admin (domain allowlist must include
   `ordre-app-41c95.web.app` and `ordre.app`).
2. Paste into `VITE_FIREBASE_APP_CHECK_SITE_KEY` locally + in prod env.
3. Firebase console → App Check → Apps → Web → register the new key.
4. `npm run build && firebase deploy --only hosting`.
5. After 24h of clean traffic on the new key, delete the old one.

### Upgrading the Node runtime

Three places need to agree:

1. `functions/package.json` → `"engines": { "node": "<version>" }`.
2. `firebase.json` → `"runtime": "nodejs<version>"`.
3. `.github/workflows/ci.yml` → both `node-version: <version>` lines.

Then touch any functions source file so Firebase doesn't skip the
deploy, and `firebase deploy --only functions`.

### GDPR deletion

Currently manual. Delete order:

1. Projects owned by the uid (`projects/*` where `members[uid] == 'owner'`), including every sub-collection (invoices, approvals, attachments) and Storage objects under `projects/<id>/...`.
2. The uid from every other project's `members` / `memberEmails` / `memberProfiles` map.
3. `users/{uid}`.
4. Auth user (Auth → Users).

An end-to-end `deleteUserAccount` callable is on the deferred list.

---

## 7. What's still missing (not launch-blocking)

See [TODO.md](TODO.md). Biggest gaps:

- Stripe self-serve billing (`createCheckoutSession` Cloud Function, `stripeWebhook`, portal).
- Email notifications on PO submit / approve / reject / close.
- Scheduled approval reminders.
- Audit log.
- Rules unit tests.
- Reports CSV / PDF export.
- Project budget KPIs.
