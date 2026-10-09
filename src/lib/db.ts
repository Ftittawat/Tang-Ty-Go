import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Expense } from "@/lib/expenses";
import { sortKey, type Member, type Status, type Trip } from "@/lib/trips";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

const g = globalThis as unknown as { __db?: Database.Database };

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

export function db(): Database.Database {
  if (g.__db) return g.__db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const d = new Database(path.join(DATA_DIR, "app.db"));
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL DEFAULT (${NOW})
    );
    CREATE TABLE IF NOT EXISTS trips (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      description  TEXT,
      status       TEXT NOT NULL DEFAULT 'todo',
      category     TEXT NOT NULL DEFAULT 'trip',
      location     TEXT,
      start_date   TEXT,
      end_date     TEXT,
      target_month INTEGER,
      target_year  INTEGER,
      owner_id     INTEGER REFERENCES members(id) ON DELETE SET NULL,
      budget       INTEGER,
      link         TEXT,
      created_at   TEXT NOT NULL DEFAULT (${NOW}),
      updated_at   TEXT NOT NULL DEFAULT (${NOW})
    );
    CREATE INDEX IF NOT EXISTS trips_status ON trips(status);
    CREATE TABLE IF NOT EXISTS trip_members (
      trip_id   INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      PRIMARY KEY (trip_id, member_id)
    );
    CREATE TABLE IF NOT EXISTS plans (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      trip_id    INTEGER REFERENCES trips(id) ON DELETE SET NULL,
      start_date TEXT,
      day_count  INTEGER NOT NULL DEFAULT 1,
      note       TEXT,
      created_at TEXT NOT NULL DEFAULT (${NOW}),
      updated_at TEXT NOT NULL DEFAULT (${NOW})
    );
    CREATE INDEX IF NOT EXISTS plans_trip ON plans(trip_id);
    CREATE TABLE IF NOT EXISTS plan_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id      INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      day          INTEGER NOT NULL DEFAULT 1,
      position     INTEGER NOT NULL DEFAULT 0,
      kind         TEXT NOT NULL DEFAULT 'activity',
      title        TEXT,
      details      TEXT,
      location     TEXT,
      start_time   TEXT,
      duration_min INTEGER,
      travel_mode  TEXT
    );
    CREATE INDEX IF NOT EXISTS plan_items_plan ON plan_items(plan_id, day, position);
    CREATE TABLE IF NOT EXISTS expenses (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id    INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      amount     INTEGER NOT NULL,
      payer_id   INTEGER REFERENCES members(id) ON DELETE SET NULL,
      split_all  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (${NOW})
    );
    CREATE INDEX IF NOT EXISTS expenses_trip ON expenses(trip_id);
    CREATE TABLE IF NOT EXISTS expense_shares (
      expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      member_id  INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      PRIMARY KEY (expense_id, member_id)
    );
    CREATE TABLE IF NOT EXISTS trip_settled (
      trip_id   INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      PRIMARY KEY (trip_id, member_id)
    );
  `);
  migrateFreeTextPeople(d);
  g.__db = d;
  return d;
}

/** v1 stored owner / participants as free text: turn every name into a member and link by id. */
function migrateFreeTextPeople(d: Database.Database) {
  const cols = (d.prepare("PRAGMA table_info(trips)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("owner")) return;

  d.transaction(() => {
    if (!cols.includes("owner_id")) {
      d.exec("ALTER TABLE trips ADD COLUMN owner_id INTEGER REFERENCES members(id) ON DELETE SET NULL");
    }
    const rows = d.prepare("SELECT id, owner, participants FROM trips").all() as
      { id: number; owner: string | null; participants: string | null }[];
    const upsert = d.prepare("INSERT INTO members (name) VALUES (?) ON CONFLICT(name) DO UPDATE SET name = name RETURNING id");
    const memberId = (name: string) => (upsert.get(name) as { id: number }).id;
    const setOwner = d.prepare("UPDATE trips SET owner_id = ? WHERE id = ?");
    const link = d.prepare("INSERT OR IGNORE INTO trip_members (trip_id, member_id) VALUES (?, ?)");

    for (const r of rows) {
      const owner = r.owner?.trim();
      if (owner) setOwner.run(memberId(owner), r.id);
      for (const p of (r.participants ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
        link.run(r.id, memberId(p));
      }
    }
    d.exec("ALTER TABLE trips DROP COLUMN owner; ALTER TABLE trips DROP COLUMN participants;");
  })();
}

// ---------- members ----------

export function listMembers(): Member[] {
  const rows = db().prepare("SELECT id, name FROM members").all() as Member[];
  return rows.sort((a, b) => a.name.localeCompare(b.name, "th"));
}

export function memberUsage(): Record<number, number> {
  const rows = db()
    .prepare(`
      SELECT m.id, COUNT(DISTINCT t.id) AS n
      FROM members m
      LEFT JOIN trip_members tm ON tm.member_id = m.id
      LEFT JOIN trips t ON t.id = tm.trip_id OR t.owner_id = m.id
      GROUP BY m.id
    `)
    .all() as { id: number; n: number }[];
  return Object.fromEntries(rows.map((r) => [r.id, r.n]));
}

/** Inserts names that don't exist yet (case-insensitive); returns how many were added. */
export function addMembers(names: string[]) {
  const ins = db().prepare("INSERT OR IGNORE INTO members (name) VALUES (?)");
  return db().transaction(() => names.reduce((n, name) => n + ins.run(name).changes, 0))();
}

export function renameMember(id: number, name: string) {
  db().prepare("UPDATE members SET name = ? WHERE id = ?").run(name, id);
}

export function deleteMember(id: number) {
  db().prepare("DELETE FROM members WHERE id = ?").run(id);
}

// ---------- trips ----------

export type TripInput = Omit<Trip, "id" | "plan_id" | "created_at" | "updated_at" | "expense_total">;

const COLUMNS = [
  "title", "description", "status", "category", "location", "start_date", "end_date",
  "target_month", "target_year", "owner_id", "budget", "link",
] as const satisfies readonly (keyof TripInput)[];

const TRIP_SELECT = `
  SELECT t.*,
    (SELECT json_group_array(member_id) FROM trip_members WHERE trip_id = t.id) AS participant_ids,
    (SELECT MIN(id) FROM plans WHERE trip_id = t.id) AS plan_id,
    (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE trip_id = t.id) AS expense_total
  FROM trips t
`;

type TripRow = Omit<Trip, "participant_ids"> & { participant_ids: string };
const toTrip = (r: TripRow): Trip => ({ ...r, participant_ids: JSON.parse(r.participant_ids) as number[] });

export function getTrip(id: number): Trip | null {
  const row = db().prepare(`${TRIP_SELECT} WHERE t.id = ?`).get(id) as TripRow | undefined;
  return row ? toTrip(row) : null;
}

export function listTrips(): Trip[] {
  const trips = (db().prepare(TRIP_SELECT).all() as TripRow[]).map(toTrip);
  // Upcoming first everywhere, except Done which shows the most recent memory first.
  const doneKey = (t: Trip) => t.end_date ?? t.start_date ?? t.updated_at;
  return trips.sort((a, b) =>
    a.status === "done" && b.status === "done"
      ? doneKey(b).localeCompare(doneKey(a))
      : sortKey(a).localeCompare(sortKey(b)) || b.created_at.localeCompare(a.created_at),
  );
}

function setParticipants(tripId: number, memberIds: number[]) {
  const d = db();
  d.prepare("DELETE FROM trip_members WHERE trip_id = ?").run(tripId);
  const link = d.prepare("INSERT OR IGNORE INTO trip_members (trip_id, member_id) VALUES (?, ?)");
  for (const m of memberIds) link.run(tripId, m);
}

const pick = (input: TripInput) => Object.fromEntries(COLUMNS.map((c) => [c, input[c]]));

export function createTrip(input: TripInput) {
  const cols = COLUMNS.join(", ");
  const params = COLUMNS.map((c) => `@${c}`).join(", ");
  return db().transaction(() => {
    const id = Number(db().prepare(`INSERT INTO trips (${cols}) VALUES (${params})`).run(pick(input)).lastInsertRowid);
    setParticipants(id, input.participant_ids);
    return id;
  })();
}

export function updateTrip(id: number, input: TripInput) {
  const sets = COLUMNS.map((c) => `${c} = @${c}`).join(", ");
  db().transaction(() => {
    db().prepare(`UPDATE trips SET ${sets}, updated_at = ${NOW} WHERE id = @id`).run({ ...pick(input), id });
    setParticipants(id, input.participant_ids);
  })();
}

export function setTripStatus(id: number, status: Status) {
  db().prepare(`UPDATE trips SET status = ?, updated_at = ${NOW} WHERE id = ?`).run(status, id);
}

export function deleteTrip(id: number) {
  db().prepare("DELETE FROM trips WHERE id = ?").run(id);
}

// ---------- expenses ----------

export type ExpenseInput = Pick<Expense, "title" | "amount" | "payer_id" | "split_all" | "share_ids">;

export function listExpenses(tripId: number): Expense[] {
  const rows = db()
    .prepare(`
      SELECT e.*, (SELECT json_group_array(member_id) FROM expense_shares WHERE expense_id = e.id) AS share_ids
      FROM expenses e
      WHERE e.trip_id = ?
      ORDER BY e.created_at, e.id
    `)
    .all(tripId) as (Omit<Expense, "share_ids" | "split_all"> & { share_ids: string; split_all: number })[];
  return rows.map((r) => ({ ...r, split_all: !!r.split_all, share_ids: JSON.parse(r.share_ids) as number[] }));
}

export function getExpense(id: number) {
  return db().prepare("SELECT id, trip_id FROM expenses WHERE id = ?").get(id) as { id: number; trip_id: number } | undefined;
}

function setShares(expenseId: number, memberIds: number[]) {
  const d = db();
  d.prepare("DELETE FROM expense_shares WHERE expense_id = ?").run(expenseId);
  const link = d.prepare("INSERT OR IGNORE INTO expense_shares (expense_id, member_id) VALUES (?, ?)");
  for (const m of memberIds) link.run(expenseId, m);
}

const expenseRow = (input: ExpenseInput) => ({
  title: input.title,
  amount: input.amount,
  payer_id: input.payer_id,
  split_all: input.split_all ? 1 : 0,
});

export function createExpense(tripId: number, input: ExpenseInput) {
  return db().transaction(() => {
    const id = Number(
      db()
        .prepare("INSERT INTO expenses (trip_id, title, amount, payer_id, split_all) VALUES (@trip_id, @title, @amount, @payer_id, @split_all)")
        .run({ ...expenseRow(input), trip_id: tripId }).lastInsertRowid,
    );
    setShares(id, input.split_all ? [] : input.share_ids);
    return id;
  })();
}

export function updateExpense(id: number, input: ExpenseInput) {
  db().transaction(() => {
    db()
      .prepare("UPDATE expenses SET title = @title, amount = @amount, payer_id = @payer_id, split_all = @split_all WHERE id = @id")
      .run({ ...expenseRow(input), id });
    setShares(id, input.split_all ? [] : input.share_ids);
  })();
}

/** Switch one expense to an explicit list of sharers (used by the tick boxes in the table). */
export function setExpenseShares(id: number, memberIds: number[]) {
  db().transaction(() => {
    db().prepare("UPDATE expenses SET split_all = 0 WHERE id = ?").run(id);
    setShares(id, memberIds);
  })();
}

export function deleteExpense(id: number) {
  db().prepare("DELETE FROM expenses WHERE id = ?").run(id);
}

export function listSettled(tripId: number): number[] {
  return (db().prepare("SELECT member_id FROM trip_settled WHERE trip_id = ?").all(tripId) as { member_id: number }[])
    .map((r) => r.member_id);
}

export function setSettled(tripId: number, memberId: number, settled: boolean) {
  db()
    .prepare(settled
      ? "INSERT OR IGNORE INTO trip_settled (trip_id, member_id) VALUES (?, ?)"
      : "DELETE FROM trip_settled WHERE trip_id = ? AND member_id = ?")
    .run(tripId, memberId);
}
