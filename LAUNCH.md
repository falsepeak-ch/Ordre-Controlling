# Ordre — launch checklist

One-time steps to go from "all green in `main`" to a running production
deployment. Work through in order. Estimated time: 60–90 minutes.

---

## 1. Third-party services

### 1a. PostHog (EU cloud)

1. Sign up / log in at **https://eu.posthog.com**.
2. **New Project** → pick an organisation → name it `Ordre`.
3. **Project settings → Project API Key** → copy the value that begins with
   `phc_…`.
4. Recommended settings (Project settings → General):
   - **Autocapture** → on.
   - **Record user sessions** → on (adds session replay for support cases).
   - **Exceptions → Enable exception capture** → on. This is what
     replaces Sentry.
5. **Project settings → Access groups → Team members** — invite yourself with
   Admin access.
6. No webhook / Slack wiring needed yet.

Save the key — you'll paste it into `.env.local` (dev) and your hosting
provider's env (prod) in step 3.

### 1b. Sentry

Nothing to do. Sentry was removed; PostHog handles errors now.

### 1c. Stripe (deferred)

Skip until billing launches. `VITE_BILLING_ENABLED` stays unset → the Pro
upgrade CTA is hidden, Pro is grantable manually via `npm run grant-pro`.

---

## 2. Firebase console setup

All steps happen at **https://console.firebase.google.com/project/ordre-app-41c95**.

### 2a. App Check (reCAPTCHA v3)

1. **Build → App Check → Apps → Web**.
2. Click the pencil / register icon. Provider: **reCAPTCHA v3**.
3. It'll redirect you to Google reCAPTCHA admin to create a v3 key for
   your domain. Add both `localhost` (dev) and `ordre.app` (prod) to the
   allowed domains. Save, copy the **site key**.
4. Back in Firebase → paste the site key → **Save**.
5. **App Check → APIs** tab. Turn **Enforce** on for all three:
   - Cloud Firestore
   - Cloud Storage
   - Cloud Functions
   Wait ~5 minutes for enforcement to propagate.
6. For local dev, flip `VITE_APP_CHECK_DEBUG=true` once, reload the app,
   open DevTools console, copy the printed debug token, then:
   - **App Check → Apps → Manage debug tokens** → paste the token,
     give it a label like "local-dev-josep".
   - Back in `.env.local`, replace `VITE_APP_CHECK_DEBUG=true` with
     `VITE_APP_CHECK_DEBUG_TOKEN=<paste the token>` so the same token
     survives across reloads.

### 2b. Analytics (GA4)

You already have `VITE_FIREBASE_MEASUREMENT_ID` in the env. Just verify:

1. **Analytics → Dashboard** — a GA4 property should exist (it was
   auto-created at project setup). If not, click **Link to Google Analytics**.
2. Nothing else to configure — `src/lib/analytics.ts` handles init after
   consent.

### 2c. Cloud Functions region + secrets

The new callable `createProject` and the storage triggers all deploy to
`europe-west1` (same as `sendProjectInvite`). No action needed — they pick
up the existing region config from `functions/src/index.ts`.

Verify your function secrets are still set:

```bash
firebase functions:secrets:access EMAIL_PASS
firebase functions:secrets:access APP_BASE_URL
```

If either is missing or you want to rotate:

```bash
firebase functions:secrets:set EMAIL_PASS
firebase functions:secrets:set APP_BASE_URL
```

### 2d. Hosting domain (if not done)

1. **Hosting → Add custom domain** → enter `ordre.app`.
2. Firebase will show DNS TXT + A records — add them at your registrar.
3. After the domain verifies (~15 min), also add `www.ordre.app` as a
   redirect target.

---

## 3. Environment variables

Update `.env.local` (dev) and set the same values in your hosting / CI env
(prod). Copy `.env.example` for the full list — new keys since the last
deploy:

| Key | Source | Required? |
|---|---|---|
| `VITE_FIREBASE_APP_CHECK_SITE_KEY` | Step 2a reCAPTCHA site key | **yes in prod** |
| `VITE_APP_CHECK_DEBUG_TOKEN` | Step 2a debug token | local only |
| `VITE_POSTHOG_KEY` | Step 1a PostHog project API key | **yes in prod** |
| `VITE_POSTHOG_HOST` | Leave unset to use EU default | no |
| `VITE_BILLING_ENABLED` | Leave unset until Stripe lands | no |

The existing `VITE_FIREBASE_*` keys stay the same.

CI note: [.github/workflows/ci.yml](.github/workflows/ci.yml) uses throwaway
placeholders during the build — it doesn't need your real values to pass
type-check / lint / build.

---

## 4. Deploy

From the repo root:

```bash
# Rules first — they're free to test before the app points at them.
firebase deploy --only firestore:rules,firestore:indexes,storage:rules

# Functions — this compiles + uploads + swaps the revisions.
firebase deploy --only functions

# Hosting — builds the Vite app, uploads dist/, cuts over the domain.
npm run build && firebase deploy --only hosting
```

Or all in one:

```bash
npm run build && firebase deploy
```

First deploy of the new functions will take ~3 minutes because it has to
cold-provision `createProject`, `onStorageObjectFinalized`, and
`onStorageObjectDeleted`.

If a function deploy fails with a permission error, make sure your
user / CI service account has the **Cloud Functions Admin** and
**Service Account User** IAM roles on the project.

---

## 5. Post-deploy verification

### 5a. App Check enforcement landed

Open `https://ordre.app/` in an incognito window, sign in. In the Firebase
console → **App Check → APIs** tab — the "Requests in last hour" graph
should show ≥ 95% **verified** within 10 minutes. Any unverified traffic is
a mis-configured client somewhere.

### 5b. Analytics wiring works

1. Accept the cookie banner on a fresh browser session.
2. In PostHog → **Live events** → you should see a `$pageview` event within
   10 seconds. Identify yourself by signing in; the event should now carry
   your `uid` as distinct ID.
3. In Firebase → **Analytics → Realtime** → you should see an active user.

If either is empty:
- PostHog silent: check `VITE_POSTHOG_KEY` is really baked into the
  production bundle (search the deployed JS for the `phc_` prefix).
- Firebase Analytics silent: confirm `VITE_FIREBASE_MEASUREMENT_ID` is set
  and that ad-blockers aren't running in your test window.

### 5c. Error capture works

In DevTools console on the deployed site:

```js
throw new Error('launch-smoke-test');
```

Within ~60 seconds PostHog → **Exceptions** should log it.

### 5d. Lighthouse score

```bash
# Headless run from local — or use the Chrome DevTools panel against ordre.app
npx lighthouse https://ordre.app/ --only-categories=performance,accessibility,seo,best-practices
```

Target: ≥ 90 Performance, ≥ 95 Accessibility / SEO / Best Practices. If
Performance misses, check that the hosting cache headers actually
landed: `curl -I https://ordre.app/assets/index-*.js` should show
`cache-control: public, max-age=31536000, immutable`.

### 5e. OG / Twitter card preview

- https://www.opengraph.xyz/url/https%3A%2F%2Fordre.app
- https://cards-dev.twitter.com/validator

If the OG image 404s, you need to add a `public/og-image.png` (1200×630,
monochrome — the `index.html` references it but we didn't ship the image
binary). Create one, re-deploy, re-check.

### 5f. Storage quota trigger working

Upload a small PDF invoice to a PO (signed in as a free-tier user). Within
~30 seconds the project's `storageBytesUsed` should bump by the file size
(check in the Firestore console under
`projects/{projectId}`). Then delete the invoice — the counter should
decrement back.

---

## 6. Operating playbook

### Granting Pro access manually (beta)

```bash
npm run grant-pro -- --email=user@example.com
# or
npm run grant-pro -- <uid> --plan=monthly
# revoke
npm run grant-pro -- <uid> --revoke
```

Requires `firebase-admin-key.json` at repo root and `FIREBASE_ADMIN_KEY_PATH`
in `.env.local`.

### Rotating the reCAPTCHA key

1. Generate a new key in the reCAPTCHA admin.
2. Paste into `VITE_FIREBASE_APP_CHECK_SITE_KEY` locally + prod env.
3. Deploy hosting.
4. Register the new key under Firebase → App Check → Apps → Web.
5. After 24h of clean traffic on the new key, remove the old one.

### Responding to a storage-quota abuse report

The `storageBytesUsed` counter on the project is the source of truth. If
it drifts out of sync (e.g. a Storage object got deleted without its
trigger firing), run:

```bash
# Use the Firebase emulator or a one-off admin script to recompute
# from the actual bucket contents. Script doesn't ship — write as needed.
```

### Removing a user's data on GDPR request

Currently manual. Via the Firebase console or an admin script:

1. Delete every project doc under `/projects/*` where
   `members[uid] == 'owner'`.
2. Delete any child subcollections (invoices, approvals, attachments).
3. Delete Storage objects under `projects/<projectId>/...` for each project.
4. Remove the user from every project's `members` map where they're an
   editor / approver / viewer.
5. Delete `users/{uid}`.
6. Delete the Firebase Auth account (Auth → Users).

A Cloud Function that does this end-to-end is on the deferred list.

---

## 7. What's still missing (not launch-blocking)

See [TODO.md](TODO.md) for the full list. Biggest gaps, in rough priority:

- Stripe self-serve billing.
- Email notifications on PO submit / approve / reject / close.
- Scheduled approval reminders.
- Audit log.
- Rules unit tests.
- Reports CSV / PDF export.
- Project budget + "budget remaining" KPI.

None of these block a beta launch — they're what to tackle once you have
real traffic.
