#!/usr/bin/env node
/**
 * Manually grant / revoke the Pro subscription for a user.
 *
 * Stripe is deferred — this script is the interim knob for giving a
 * user Pro access. It writes the fields that `SubscriptionContext`
 * watches (`subscriptionStatus`, `subscriptionPlan`) via the admin
 * SDK, which bypasses the users-doc rule that normally blocks the
 * client from touching these fields.
 *
 * Usage:
 *   node scripts/grant-pro.mjs <uid>                   # grant (annual)
 *   node scripts/grant-pro.mjs <uid> --plan=monthly    # grant (monthly)
 *   node scripts/grant-pro.mjs <uid> --revoke          # revoke back to free
 *   node scripts/grant-pro.mjs --email=user@foo.com    # grant by email
 *
 * Requires:
 *   FIREBASE_ADMIN_KEY_PATH pointing at a service-account JSON.
 *   .env.local (the seed script pattern) or env vars.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

async function loadEnv() {
  try {
    const contents = await fs.readFile(path.join(repoRoot, '.env.local'), 'utf8');
    for (const rawLine of contents.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx === -1) continue;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    // no .env.local — rely on process.env
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { uid: null, email: null, plan: 'annual', revoke: false };
  for (const raw of args) {
    if (raw === '--revoke') out.revoke = true;
    else if (raw.startsWith('--plan=')) out.plan = raw.slice('--plan='.length);
    else if (raw.startsWith('--email=')) out.email = raw.slice('--email='.length);
    else if (!raw.startsWith('--')) out.uid = raw;
  }
  if (out.plan !== 'monthly' && out.plan !== 'annual') {
    throw new Error(`Invalid --plan value "${out.plan}" (expected monthly | annual).`);
  }
  if (!out.uid && !out.email) {
    throw new Error('Usage: grant-pro.mjs <uid> OR --email=<address>');
  }
  return out;
}

await loadEnv();

const keyPath = path.resolve(
  repoRoot,
  process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin-key.json',
);

let serviceAccount;
try {
  serviceAccount = JSON.parse(await fs.readFile(keyPath, 'utf8'));
} catch (err) {
  console.error(`[grant-pro] cannot read service-account at ${keyPath}`);
  throw err;
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const auth = getAuth();

const args = parseArgs();

let uid = args.uid;
if (!uid && args.email) {
  const record = await auth.getUserByEmail(args.email);
  uid = record.uid;
  console.log(`[grant-pro] resolved ${args.email} → ${uid}`);
}

const userRef = db.doc(`users/${uid}`);
const userSnap = await userRef.get();
if (!userSnap.exists) {
  throw new Error(`users/${uid} does not exist. Has the user signed in at least once?`);
}

if (args.revoke) {
  await userRef.set(
    {
      subscriptionStatus: 'canceled',
      subscriptionPlan: null,
      subscriptionCurrentPeriodEnd: null,
    },
    { merge: true },
  );
  console.log(`[grant-pro] revoked Pro for ${uid}`);
} else {
  const inOneYear = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  await userRef.set(
    {
      subscriptionStatus: 'active',
      subscriptionPlan: args.plan,
      subscriptionCurrentPeriodEnd: inOneYear,
    },
    { merge: true },
  );
  console.log(`[grant-pro] granted Pro (${args.plan}) to ${uid}, expires ${inOneYear}`);
}

// Optionally bump owned projects' storage caps so the new tier takes
// effect immediately.
const TEN_GB = 10 * 1024 * 1024 * 1024;
const THREE_HUNDRED_MB = 300 * 1024 * 1024;
const newCap = args.revoke ? THREE_HUNDRED_MB : TEN_GB;
const ownedSnap = await db
  .collection('projects')
  .where(`members.${uid}`, '==', 'owner')
  .get();

await Promise.all(
  ownedSnap.docs.map((d) =>
    d.ref.set({ storageCapBytes: newCap }, { merge: true }),
  ),
);
console.log(`[grant-pro] updated storageCapBytes on ${ownedSnap.size} owned project(s) to ${newCap} bytes`);

process.exit(0);
