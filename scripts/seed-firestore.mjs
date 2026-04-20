#!/usr/bin/env node
/**
 * Firestore seed script.
 *
 * Reads the prototype seed data from reference/assets/data.js, normalises it,
 * and writes it as a PROJECT owned by SEED_OWNER_UID.
 *
 * Usage:
 *   1. Download a service-account JSON from Firebase console and save it
 *      (default path: ./firebase-admin-key.json, gitignored).
 *   2. Fill SEED_OWNER_UID in .env.local with your Firebase UID.
 *   3. npm run seed
 *
 * Idempotent: skips existing docs unless --force is passed.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

// --- Load .env.local --------------------------------------------------------
async function loadEnv() {
  try {
    const contents = await fs.readFile(path.join(repoRoot, '.env.local'), 'utf8');
    for (const rawLine of contents.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local missing — rely on existing environment.
  }
}
await loadEnv();

const KEY_PATH = process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin-key.json';
const OWNER_UID = process.env.SEED_OWNER_UID;
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL || '';
const OWNER_NAME = process.env.SEED_OWNER_NAME || 'Project owner';
const force = process.argv.includes('--force');

if (!OWNER_UID) {
  console.error('[seed] SEED_OWNER_UID is missing. Set it in .env.local (grab it from Firebase Auth → Users).');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(await fs.readFile(path.resolve(repoRoot, KEY_PATH), 'utf8'));
} catch {
  console.error(`[seed] Could not read service-account JSON at ${KEY_PATH}.`);
  console.error('       Download one from Firebase → Settings → Service accounts.');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore();

// --- Load prototype data ----------------------------------------------------
const protoJsPath = path.join(repoRoot, 'reference/assets/data.js');
const protoSrc = await fs.readFile(protoJsPath, 'utf8');
const sandbox = { window: {}, Intl };
const evaluator = new Function('window', 'Intl', protoSrc);
evaluator(sandbox.window, sandbox.Intl);
const { suppliers, purchaseOrders, workspace } = sandbox.window.Ordre;

// --- Helpers ---------------------------------------------------------------
async function upsert(docRef, data) {
  const snap = await docRef.get();
  if (snap.exists && !force) return 'skipped';
  await docRef.set(data, { merge: true });
  return snap.exists ? 'updated' : 'created';
}

// --- Seed ------------------------------------------------------------------
async function seed() {
  const projectId = 'studio-verdera';
  const projectRef = db.collection('projects').doc(projectId);

  // 1. Project
  const projectResult = await upsert(projectRef, {
    id: projectId,
    name: workspace.name,
    description: 'Seeded from the reference prototype — film production + small office context.',
    initial: workspace.initial,
    currency: 'EUR',
    createdBy: OWNER_UID,
    createdAt: FieldValue.serverTimestamp(),
    members: { [OWNER_UID]: 'owner' },
    memberEmails: { [OWNER_UID]: OWNER_EMAIL.toLowerCase() },
    memberProfiles: {
      [OWNER_UID]: {
        displayName: OWNER_NAME,
        email: OWNER_EMAIL.toLowerCase(),
        photoURL: null,
      },
    },
  });
  console.log(`[seed] project ${projectId}: ${projectResult}`);

  // 2. Link to /users/{uid} so the app picks it up as default.
  await db.collection('users').doc(OWNER_UID).set(
    { defaultProjectId: projectId },
    { merge: true },
  );

  // 3. Suppliers
  for (const s of suppliers) {
    const ref = projectRef.collection('suppliers').doc(s.id);
    const res = await upsert(ref, s);
    console.log(`[seed] supplier ${s.id}: ${res}`);
  }

  // 4. Purchase orders + nested invoices + approvals
  for (const po of purchaseOrders) {
    const { invoices = [], approvals = [], ...poDoc } = po;
    const poRef = projectRef.collection('purchaseOrders').doc(po.id);
    const res = await upsert(poRef, poDoc);
    console.log(`[seed] PO ${po.number}: ${res}`);

    for (const inv of invoices) {
      const invRef = poRef.collection('invoices').doc(inv.id);
      await upsert(invRef, inv);
    }
    for (const [i, a] of approvals.entries()) {
      const apRef = poRef.collection('approvals').doc(`${po.id}_ap_${i}`);
      await upsert(apRef, { id: `${po.id}_ap_${i}`, ...a });
    }
  }

  console.log(`[seed] done. Project owner: ${OWNER_UID}. Use --force to overwrite existing docs.`);
}

await seed();
