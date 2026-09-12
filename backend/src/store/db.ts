import path from "node:path";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

export type Category = "a_repondre" | "a_lire" | "sans_interet";

export interface EmailState {
  category: Category;
  categoryReason: string;
  overridden: boolean;
  draft: string | null;
  sent: boolean;
}

interface Schema {
  emails: Record<string, EmailState>;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const dbFile = new JSONFile<Schema>(path.join(DATA_DIR, "db.json"));
const db = new Low<Schema>(dbFile, { emails: {} });

let loaded = false;
async function ensureLoaded() {
  if (!loaded) {
    await db.read();
    db.data ??= { emails: {} };
    loaded = true;
  }
}

export async function getEmailState(id: string): Promise<EmailState | undefined> {
  await ensureLoaded();
  return db.data.emails[id];
}

export async function setClassification(
  id: string,
  category: Category,
  categoryReason: string,
): Promise<void> {
  await ensureLoaded();
  const existing = db.data.emails[id];
  db.data.emails[id] = {
    category,
    categoryReason,
    overridden: existing?.overridden ?? false,
    draft: existing?.draft ?? null,
    sent: existing?.sent ?? false,
  };
  await db.write();
}

export async function overrideCategory(id: string, category: Category): Promise<void> {
  await ensureLoaded();
  const existing = db.data.emails[id];
  db.data.emails[id] = {
    category,
    categoryReason: existing?.categoryReason ?? "Choix manuel",
    overridden: true,
    draft: existing?.draft ?? null,
    sent: existing?.sent ?? false,
  };
  await db.write();
}

export async function setDraft(id: string, draft: string): Promise<void> {
  await ensureLoaded();
  const existing = db.data.emails[id];
  if (!existing) throw new Error(`Email ${id} inconnu en base locale`);
  existing.draft = draft;
  await db.write();
}

export async function markSent(id: string): Promise<void> {
  await ensureLoaded();
  const existing = db.data.emails[id];
  if (!existing) throw new Error(`Email ${id} inconnu en base locale`);
  existing.sent = true;
  await db.write();
}
