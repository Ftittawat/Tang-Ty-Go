import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Expense } from "@/lib/expenses";
import { isRole, sortKey, type Board, type Member, type Role, type Status, type Trip } from "@/lib/trips";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

const g = globalThis as unknown as { __db?: Database.Database };

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

/** A member is a name on one board; `user_id` (Better Auth user) is set once someone signs in as that name. */
const MEMBERS_COLUMNS = `
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id   INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name       TEXT NOT NULL COLLATE NOCASE,
  user_id    TEXT,
  role       TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT (${NOW}),
  UNIQUE (board_id, name),
  UNIQUE (board_id, user_id)
`;

export function db(): Database.Database {
  if (g.__db) return g.__db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const d = new Database(path.join(DATA_DIR, "app.db"));
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      code       TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (${NOW})
    );
    CREATE TABLE IF NOT EXISTS members (${MEMBERS_COLUMNS});
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
      board_id     INTEGER REFERENCES boards(id) ON DELETE CASCADE,
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
      board_id   INTEGER REFERENCES boards(id) ON DELETE CASCADE,
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
      travel_mode  TEXT,
      activity_type TEXT
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
  dropBadminton(d);
  migrateBoards(d);
  // v4: activities get a type (กิน / คาเฟ่ / เที่ยวชม …); existing ones stay unset.
  if (!(d.prepare("PRAGMA table_info(plan_items)").all() as { name: string }[]).some((c) => c.name === "activity_type")) {
    d.exec("ALTER TABLE plan_items ADD COLUMN activity_type TEXT");
  }
  d.exec(`
    CREATE INDEX IF NOT EXISTS trips_board ON trips(board_id);
    CREATE INDEX IF NOT EXISTS plans_board ON plans(board_id);
  `);
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

/**
 * The badminton page was removed. People who were only on the badminton list (tagged "badminton"
 * but not "general") and are on no trip or bill go with it; everyone else stays.
 */
function dropBadminton(d: Database.Database) {
  const hasTags = !!d.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'member_tags'").get();
  d.transaction(() => {
    if (hasTags) {
      d.exec(`
        DELETE FROM members WHERE id IN (
          SELECT member_id FROM member_tags WHERE tag = 'badminton'
          EXCEPT SELECT member_id FROM member_tags WHERE tag = 'general'
        )
        AND id NOT IN (SELECT member_id FROM trip_members)
        AND id NOT IN (SELECT owner_id FROM trips WHERE owner_id IS NOT NULL)
        AND id NOT IN (SELECT payer_id FROM expenses WHERE payer_id IS NOT NULL)
        AND id NOT IN (SELECT member_id FROM expense_shares)
        AND id NOT IN (SELECT member_id FROM trip_settled)
      `);
    }
    d.exec("DROP TABLE IF EXISTS badminton_players; DROP TABLE IF EXISTS badminton_sessions; DROP TABLE IF EXISTS member_tags;");
  })();
}

/**
 * v3: everything lives on a board. Data from before boards moves into one "Tang-Ty Go" board;
 * its names are unclaimed until people join with the code and pick their name.
 */
function migrateBoards(d: Database.Database) {
  const cols = (d.prepare("PRAGMA table_info(members)").all() as { name: string }[]).map((c) => c.name);
  if (cols.includes("board_id")) return;

  const hasData = (d.prepare("SELECT (SELECT COUNT(*) FROM members) + (SELECT COUNT(*) FROM trips) + (SELECT COUNT(*) FROM plans) AS n").get() as { n: number }).n > 0;
  const role = cols.includes("role") ? "role" : "'member'";

  // Rebuilding `members` (its UNIQUE changes) needs foreign keys off, and that pragma is ignored inside a transaction.
  d.pragma("foreign_keys = OFF");
  try {
    d.transaction(() => {
      const legacy = hasData
        ? Number(d.prepare("INSERT INTO boards (name, code) VALUES ('Tang-Ty Go', ?)").run(newBoardCode()).lastInsertRowid)
        : null;
      d.exec(`CREATE TABLE members_new (${MEMBERS_COLUMNS})`);
      d.prepare(`INSERT INTO members_new (id, board_id, name, role, created_at) SELECT id, ?, name, ${role}, created_at FROM members`).run(legacy);
      d.exec("DROP TABLE members; ALTER TABLE members_new RENAME TO members;");
      const tripCols = (d.prepare("PRAGMA table_info(trips)").all() as { name: string }[]).map((c) => c.name);
      if (!tripCols.includes("board_id")) d.exec("ALTER TABLE trips ADD COLUMN board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE");
      const planCols = (d.prepare("PRAGMA table_info(plans)").all() as { name: string }[]).map((c) => c.name);
      if (!planCols.includes("board_id")) d.exec("ALTER TABLE plans ADD COLUMN board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE");
      d.prepare("UPDATE trips SET board_id = ?").run(legacy);
      d.prepare("UPDATE plans SET board_id = ?").run(legacy);
      const broken = d.prepare("PRAGMA foreign_key_check").all();
      if (broken.length) throw new Error(`Board migration left ${broken.length} broken references`);
    })();
  } finally {
    d.pragma("foreign_keys = ON");
  }
}

// ---------- boards ----------

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

/** "K7QM-3XPA": 8 random characters, easy to read out loud. */
function newBoardCode() {
  const chars = Array.from(crypto.randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/** Accepts "k7qm3xpa", "K7QM 3XPA", a pasted invite link… → "K7QM-3XPA" (or null). */
export function normalizeBoardCode(raw: string) {
  const chars = raw.toUpperCase().replace(/^.*\/JOIN\//, "").replace(/[^A-Z0-9]/g, "");
  return chars.length === 8 ? `${chars.slice(0, 4)}-${chars.slice(4)}` : null;
}

export function createBoard(name: string): Board {
  const code = newBoardCode();
  const id = Number(db().prepare("INSERT INTO boards (name, code) VALUES (?, ?)").run(name, code).lastInsertRowid);
  return { id, name, code };
}

export function getBoard(id: number) {
  return db().prepare("SELECT id, name, code FROM boards WHERE id = ?").get(id) as Board | undefined;
}

export function boardByCode(code: string) {
  return db().prepare("SELECT id, name, code FROM boards WHERE code = ?").get(code) as Board | undefined;
}

export function renameBoard(id: number, name: string) {
  db().prepare("UPDATE boards SET name = ? WHERE id = ?").run(name, id);
}

/** New invite code; the old one stops working. */
export function resetBoardCode(id: number) {
  db().prepare("UPDATE boards SET code = ? WHERE id = ?").run(newBoardCode(), id);
}

export type MyBoard = Board & { member_id: number; member_name: string; role: Role };

export function boardsForUser(userId: string): MyBoard[] {
  const rows = db()
    .prepare(`
      SELECT b.id, b.name, b.code, m.id AS member_id, m.name AS member_name, m.role
      FROM members m JOIN boards b ON b.id = m.board_id
      WHERE m.user_id = ?
      ORDER BY m.created_at, m.id
    `)
    .all(userId) as (Omit<MyBoard, "role"> & { role: string })[];
  return rows.map((r) => ({ ...r, role: isRole(r.role) ? r.role : "member" }));
}

export type BoardSummary = Board & {
  created_at: string;
  member_count: number;
  /** Names someone signed in as (the rest are names an admin typed in). */
  joined_count: number;
  trip_count: number;
  plan_count: number;
};

/** Every board (system admins only). */
export function listAllBoards(): BoardSummary[] {
  return db()
    .prepare(`
      SELECT b.id, b.name, b.code, b.created_at,
        (SELECT COUNT(*) FROM members WHERE board_id = b.id) AS member_count,
        (SELECT COUNT(*) FROM members WHERE board_id = b.id AND user_id IS NOT NULL) AS joined_count,
        (SELECT COUNT(*) FROM trips WHERE board_id = b.id) AS trip_count,
        (SELECT COUNT(*) FROM plans WHERE board_id = b.id) AS plan_count
      FROM boards b ORDER BY b.created_at, b.id
    `)
    .all() as BoardSummary[];
}

/**
 * Deletes a board and everything on it: members, trips (with their bills) and plans (with their
 * items) all go through ON DELETE CASCADE. Google accounts are untouched.
 */
export function deleteBoard(id: number) {
  return db().prepare("DELETE FROM boards WHERE id = ?").run(id).changes > 0;
}

/**
 * Signs a user into a board as a new name, or as an existing unclaimed name (`claimId`) so the
 * trips and bills already under that name become theirs.
 */
export function joinBoard(boardId: number, userId: string, role: Role, by: { name: string } | { claimId: number }) {
  const d = db();
  if ("claimId" in by) {
    const r = d.prepare("UPDATE members SET user_id = ?, role = ? WHERE id = ? AND board_id = ? AND user_id IS NULL")
      .run(userId, role, by.claimId, boardId);
    return r.changes > 0;
  }
  d.prepare("INSERT INTO members (board_id, name, user_id, role) VALUES (?, ?, ?, ?)").run(boardId, by.name, userId, role);
  return true;
}

// ---------- members ----------

type MemberRow = { id: number; name: string; user_id: string | null; role: string };
const toMember = (r: MemberRow): Member => ({
  id: r.id, name: r.name, linked: r.user_id !== null, role: isRole(r.role) ? r.role : "member",
});

export function listMembers(boardId: number): Member[] {
  return (db().prepare("SELECT id, name, user_id, role FROM members WHERE board_id = ?").all(boardId) as MemberRow[])
    .map(toMember)
    .sort((a, b) => a.name.localeCompare(b.name, "th"));
}

/** The member row only if it's on this board (guards every action that takes a member id). */
export function getMember(id: number, boardId: number) {
  const r = db().prepare("SELECT id, name, user_id, role FROM members WHERE id = ? AND board_id = ?").get(id, boardId) as
    MemberRow | undefined;
  return r ? toMember(r) : null;
}

export function memberByName(boardId: number, name: string) {
  const r = db().prepare("SELECT id, name, user_id, role FROM members WHERE board_id = ? AND name = ?").get(boardId, name) as
    MemberRow | undefined;
  return r ? toMember(r) : null;
}

export function memberUsage(boardId: number): Record<number, number> {
  const rows = db()
    .prepare(`
      SELECT m.id, COUNT(DISTINCT t.id) AS n
      FROM members m
      LEFT JOIN trip_members tm ON tm.member_id = m.id
      LEFT JOIN trips t ON t.id = tm.trip_id OR t.owner_id = m.id
      WHERE m.board_id = ?
      GROUP BY m.id
    `)
    .all(boardId) as { id: number; n: number }[];
  return Object.fromEntries(rows.map((r) => [r.id, r.n]));
}

/** Inserts names that don't exist on the board yet (case-insensitive). Returns how many were new. */
export function addMembers(boardId: number, names: string[]) {
  const d = db();
  const ins = d.prepare("INSERT OR IGNORE INTO members (board_id, name) VALUES (?, ?)");
  return d.transaction(() => names.reduce((n, name) => n + ins.run(boardId, name).changes, 0))();
}

export function setMemberRole(id: number, role: Role) {
  db().prepare("UPDATE members SET role = ? WHERE id = ?").run(role, id);
}

export function countAdmins(boardId: number) {
  return (db().prepare("SELECT COUNT(*) AS n FROM members WHERE board_id = ? AND role = 'admin' AND user_id IS NOT NULL").get(boardId) as { n: number }).n;
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

/** The trip only if it's on this board (guards every page and action that takes a trip id). */
export function getTrip(id: number, boardId: number): Trip | null {
  const row = db().prepare(`${TRIP_SELECT} WHERE t.id = ? AND t.board_id = ?`).get(id, boardId) as TripRow | undefined;
  return row ? toTrip(row) : null;
}

export function listTrips(boardId: number): Trip[] {
  const trips = (db().prepare(`${TRIP_SELECT} WHERE t.board_id = ?`).all(boardId) as TripRow[]).map(toTrip);
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

export function createTrip(boardId: number, input: TripInput) {
  const cols = COLUMNS.join(", ");
  const params = COLUMNS.map((c) => `@${c}`).join(", ");
  return db().transaction(() => {
    const id = Number(
      db().prepare(`INSERT INTO trips (board_id, ${cols}) VALUES (@board_id, ${params})`).run({ ...pick(input), board_id: boardId }).lastInsertRowid,
    );
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
