/* ==========================================================================
   Category (chart of accounts) helpers.

   Stored at: /projects/{projectId}/categories/{categoryId}
   The code field is used as the doc id so the collection is naturally
   indexed by code and an import run can upsert cleanly by re-using ids.
   ========================================================================== */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Category } from '~/types';

function catsCol(projectId: string) {
  return collection(db, 'projects', projectId, 'categories');
}

export interface CategoryInput {
  code: string;
  concept: string;
}

function sanitizeCode(code: string): string {
  return code.trim().replace(/\s+/g, ' ').slice(0, 64);
}

function sanitizeConcept(concept: string): string {
  return concept.trim().replace(/\s+/g, ' ').slice(0, 160);
}

/** Convert an arbitrary code to a Firestore-safe document id. */
function codeToId(code: string): string {
  return sanitizeCode(code).replace(/[./#$[\]]/g, '_') || 'cat';
}

export async function createCategory(
  projectId: string,
  input: CategoryInput,
): Promise<string> {
  const code = sanitizeCode(input.code);
  const concept = sanitizeConcept(input.concept);
  if (!code) throw new Error('code-required');
  if (!concept) throw new Error('concept-required');

  const id = codeToId(code);
  await setDoc(doc(catsCol(projectId), id), {
    id,
    code,
    concept,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function updateCategory(
  projectId: string,
  id: string,
  patch: Partial<CategoryInput>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.code !== undefined) payload.code = sanitizeCode(patch.code);
  if (patch.concept !== undefined) payload.concept = sanitizeConcept(patch.concept);
  if (Object.keys(payload).length === 0) return;
  await updateDoc(doc(catsCol(projectId), id), payload);
}

export async function deleteCategory(projectId: string, id: string): Promise<void> {
  await deleteDoc(doc(catsCol(projectId), id));
}

// --------------------------------------------------------------------------
// CSV parsing + bulk import
// --------------------------------------------------------------------------

export interface ParsedCategoryRow {
  code: string;
  concept: string;
  line: number;
}

/**
 * Minimal, forgiving CSV parser:
 *   - First non-empty line optionally treated as a header if it matches
 *     "code" + "concept|description|account description".
 *   - Fields separated by comma, semicolon, or tab.
 *   - Quoted fields ("...") allow commas and embedded quotes as "".
 *   - Empty lines are skipped.
 *   - Lines with fewer than two fields are skipped.
 */
export function parseCategoriesCsv(text: string): ParsedCategoryRow[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const rows: ParsedCategoryRow[] = [];

  // Pick a delimiter by sniffing the first non-empty line.
  const firstLine = lines.find((l) => l.trim().length > 0) ?? '';
  const delimiter = pickDelimiter(firstLine);

  let skippedHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const fields = splitCsvLine(raw, delimiter);
    if (fields.length < 2) continue;

    const [first, second] = fields;
    if (!skippedHeader && looksLikeHeader(first, second)) {
      skippedHeader = true;
      continue;
    }

    const code = (first ?? '').trim();
    const concept = (second ?? '').trim();
    if (!code || !concept) continue;
    rows.push({ code, concept, line: i + 1 });
  }

  return rows;
}

function pickDelimiter(line: string): ',' | ';' | '\t' {
  if (line.includes('\t')) return '\t';
  if (line.includes(';') && !line.includes(',')) return ';';
  return ',';
}

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuote = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === delim) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function looksLikeHeader(first: string, second: string): boolean {
  const a = first.toLowerCase().trim();
  const b = second.toLowerCase().trim();
  if (!a && !b) return false;
  const codeLike = a === 'code' || a === 'account' || a === 'account number' || a === 'cuenta' || a === 'codi';
  const conceptLike = ['concept', 'description', 'account description', 'concepto', 'descripción', 'descripcio', 'descripció'].includes(b);
  return codeLike || conceptLike;
}

export interface ImportReport {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  collisions: Array<{ code: string; lines: number[] }>;
}

export async function importCategories(
  projectId: string,
  rows: ParsedCategoryRow[],
): Promise<ImportReport> {
  // Dedupe by code — the last occurrence wins, record collisions for UX.
  const byCode = new Map<string, ParsedCategoryRow>();
  const collisionMap = new Map<string, number[]>();
  for (const r of rows) {
    const key = sanitizeCode(r.code);
    if (byCode.has(key)) {
      const lines = collisionMap.get(key) ?? [byCode.get(key)!.line];
      lines.push(r.line);
      collisionMap.set(key, lines);
    }
    byCode.set(key, { ...r, code: key });
  }

  const existing = new Set((await getDocs(catsCol(projectId))).docs.map((d) => d.id));

  // Firestore batch caps at 500 ops; chunk if we ever get there.
  const entries = [...byCode.entries()];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let offset = 0; offset < entries.length; offset += 400) {
    const slice = entries.slice(offset, offset + 400);
    const batch = writeBatch(db);
    for (const [code, row] of slice) {
      const id = codeToId(code);
      const concept = sanitizeConcept(row.concept);
      if (!code || !concept) {
        skipped += 1;
        continue;
      }
      const ref = doc(catsCol(projectId), id);
      batch.set(
        ref,
        {
          id,
          code,
          concept,
          createdAt: existing.has(id) ? undefined : serverTimestamp(),
        },
        { merge: true },
      );
      if (existing.has(id)) updated += 1;
      else created += 1;
    }
    await batch.commit();
  }

  const collisions = [...collisionMap.entries()].map(([code, lines]) => ({ code, lines }));
  return { total: byCode.size, created, updated, skipped, collisions };
}

/** Turn an in-memory list of categories into a CSV string for export. */
export function categoriesToCsv(categories: Category[]): string {
  const rows = ['code,concept'];
  for (const c of categories) {
    rows.push(`${csvEscape(c.code)},${csvEscape(c.concept)}`);
  }
  return rows.join('\n');
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
