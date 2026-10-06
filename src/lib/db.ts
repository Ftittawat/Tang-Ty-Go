import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { sortKey, type Status, type Trip } from "@/lib/trips";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

const g = globalThis as unknown as { __db?: Database.Database };

export function db(): Database.Database {
  if (g.__db) return g.__db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const d = new Database(path.join(DATA_DIR, "app.db"));
  d.pragma("journal_mode = WAL");
  d.exec(`
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
      owner        TEXT,
      participants TEXT,
      budget       INTEGER,
      link         TEXT,
      created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS trips_status ON trips(status);
  `);
  g.__db = d;
  return d;
}

export type TripInput = Omit<Trip, "id" | "created_at" | "updated_at">;

const COLUMNS = [
  "title", "description", "status", "category", "location", "start_date", "end_date",
  "target_month", "target_year", "owner", "participants", "budget", "link",
] as const satisfies readonly (keyof TripInput)[];

export function listTrips(): Trip[] {
  const rows = db().prepare("SELECT * FROM trips").all() as Trip[];
  // Upcoming first everywhere, except Done which shows the most recent memory first.
  const doneKey = (t: Trip) => t.end_date ?? t.start_date ?? t.updated_at;
  return rows.sort((a, b) =>
    a.status === "done" && b.status === "done"
      ? doneKey(b).localeCompare(doneKey(a))
      : sortKey(a).localeCompare(sortKey(b)) || b.created_at.localeCompare(a.created_at),
  );
}

export function createTrip(input: TripInput) {
  const cols = COLUMNS.join(", ");
  const params = COLUMNS.map((c) => `@${c}`).join(", ");
  return db().prepare(`INSERT INTO trips (${cols}) VALUES (${params})`).run(input).lastInsertRowid;
}

export function updateTrip(id: number, input: TripInput) {
  const sets = COLUMNS.map((c) => `${c} = @${c}`).join(", ");
  db()
    .prepare(`UPDATE trips SET ${sets}, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = @id`)
    .run({ ...input, id });
}

export function setTripStatus(id: number, status: Status) {
  db()
    .prepare("UPDATE trips SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?")
    .run(status, id);
}

export function deleteTrip(id: number) {
  db().prepare("DELETE FROM trips WHERE id = ?").run(id);
}
