import { isTone, type Announcement, type AnnouncementAdmin, type AnnouncementInput } from "@/lib/announcements";
import { db } from "@/lib/db";
import {
  DEFAULT_FEATURES, isBoardFeatureKey, isFeatureKey,
  type BoardFeatureKey, type FeatureKey, type FeatureState,
} from "@/lib/features";

// ---------- feature flags ----------

/** Whole-app switches: defaults with the stored overrides on top. */
export function globalFeatures(): FeatureState {
  const rows = db().prepare("SELECT key, enabled FROM feature_flags").all() as { key: string; enabled: number }[];
  const out = { ...DEFAULT_FEATURES };
  for (const r of rows) if (isFeatureKey(r.key)) out[r.key] = !!r.enabled;
  return out;
}

/** What one board sets differently from the whole app (missing = follows the app). */
export function boardOverrides(boardId: number): Partial<Record<BoardFeatureKey, boolean>> {
  const rows = db().prepare("SELECT key, enabled FROM board_features WHERE board_id = ?").all(boardId) as
    { key: string; enabled: number }[];
  return Object.fromEntries(rows.filter((r) => isBoardFeatureKey(r.key)).map((r) => [r.key, !!r.enabled]));
}

/** Board override → whole-app switch → default. `null` board = only the whole-app switches. */
export function resolveFeatures(boardId: number | null): FeatureState {
  const out = globalFeatures();
  if (boardId !== null) Object.assign(out, boardOverrides(boardId));
  return out;
}

export function setGlobalFeature(key: FeatureKey, enabled: boolean) {
  db()
    .prepare(`INSERT INTO feature_flags (key, enabled) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET enabled = excluded.enabled, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`)
    .run(key, enabled ? 1 : 0);
}

/** `null` removes the override, so the board follows the whole-app switch again. */
export function setBoardFeature(boardId: number, key: BoardFeatureKey, enabled: boolean | null) {
  if (enabled === null) {
    db().prepare("DELETE FROM board_features WHERE board_id = ? AND key = ?").run(boardId, key);
  } else {
    db()
      .prepare("INSERT INTO board_features (board_id, key, enabled) VALUES (?, ?, ?) ON CONFLICT(board_id, key) DO UPDATE SET enabled = excluded.enabled")
      .run(boardId, key, enabled ? 1 : 0);
  }
}

/** How many boards override each switch (shown next to the whole-app switch). */
export function overrideCounts(): Partial<Record<BoardFeatureKey, number>> {
  const rows = db().prepare("SELECT key, COUNT(*) AS n FROM board_features GROUP BY key").all() as { key: string; n: number }[];
  return Object.fromEntries(rows.filter((r) => isBoardFeatureKey(r.key)).map((r) => [r.key, r.n]));
}

// ---------- overview ----------

export type SystemStats = {
  users: number;
  banned: number;
  boards: number;
  trips: number;
  plans: number;
  expenses: number;
  /** Signed in during the last 7 days. */
  active_users: number;
};

export function systemStats(): SystemStats {
  return db()
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM "user") AS users,
        (SELECT COUNT(*) FROM user_bans) AS banned,
        (SELECT COUNT(*) FROM boards) AS boards,
        (SELECT COUNT(*) FROM trips) AS trips,
        (SELECT COUNT(*) FROM plans) AS plans,
        (SELECT COUNT(*) FROM expenses) AS expenses,
        (SELECT COUNT(DISTINCT userId) FROM session WHERE updatedAt >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')) AS active_users
    `)
    .get() as SystemStats;
}

// ---------- users ----------

export type UserBoard = { id: number; name: string; member: string; role: string };

export type AppUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  created_at: string;
  /** Latest session activity, if they still have a session. */
  last_seen: string | null;
  boards: UserBoard[];
  banned: { reason: string | null; at: string } | null;
};

type UserRow = Omit<AppUser, "boards" | "banned"> & { boards: string; ban_reason: string | null; banned_at: string | null };

const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.image, u.createdAt AS created_at,
    (SELECT MAX(s.updatedAt) FROM session s WHERE s.userId = u.id) AS last_seen,
    (SELECT json_group_array(json_object('id', b.id, 'name', b.name, 'member', m.name, 'role', m.role))
       FROM members m JOIN boards b ON b.id = m.board_id WHERE m.user_id = u.id) AS boards,
    ub.reason AS ban_reason, ub.created_at AS banned_at
  FROM "user" u LEFT JOIN user_bans ub ON ub.user_id = u.id
`;

const toUser = ({ boards, ban_reason, banned_at, ...r }: UserRow): AppUser => ({
  ...r,
  boards: JSON.parse(boards) as UserBoard[],
  banned: banned_at ? { reason: ban_reason, at: banned_at } : null,
});

export function listUsers(): AppUser[] {
  return (db().prepare(`${USER_SELECT} ORDER BY u.createdAt DESC`).all() as UserRow[]).map(toUser);
}

export function getUser(id: string): AppUser | null {
  const r = db().prepare(`${USER_SELECT} WHERE u.id = ?`).get(id) as UserRow | undefined;
  return r ? toUser(r) : null;
}

export function isBannedEmail(email: string) {
  return !!db()
    .prepare(`SELECT 1 FROM user_bans b JOIN "user" u ON u.id = b.user_id WHERE lower(u.email) = lower(?)`)
    .get(email);
}

export function isBannedUser(id: string) {
  return !!db().prepare("SELECT 1 FROM user_bans WHERE user_id = ?").get(id);
}

/** Bans and signs them out everywhere at once (sessions live in the database, no cookie cache). */
export function banUser(id: string, reason: string | null) {
  const d = db();
  d.transaction(() => {
    d.prepare("INSERT INTO user_bans (user_id, reason) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET reason = excluded.reason").run(id, reason);
    d.prepare("DELETE FROM session WHERE userId = ?").run(id);
  })();
}

export function unbanUser(id: string) {
  db().prepare("DELETE FROM user_bans WHERE user_id = ?").run(id);
}

/**
 * Deletes the Google account from the app (sessions and linked accounts cascade). Their names on
 * boards stay with every trip and bill, but become unclaimed so someone can pick them again.
 */
export function deleteUser(id: string) {
  const d = db();
  d.transaction(() => {
    d.prepare("UPDATE members SET user_id = NULL, role = 'member' WHERE user_id = ?").run(id);
    d.prepare("DELETE FROM user_bans WHERE user_id = ?").run(id);
    d.prepare("DELETE FROM announcement_dismissals WHERE user_id = ?").run(id);
    d.prepare(`DELETE FROM "user" WHERE id = ?`).run(id);
  })();
}

// ---------- one board ----------

export type BoardMemberRow = { id: number; name: string; role: string; email: string | null };

/** The board's names, with the Google email of whoever signed in as each one. */
export function boardMembersWithEmail(boardId: number): BoardMemberRow[] {
  return db()
    .prepare(`
      SELECT m.id, m.name, m.role, u.email
      FROM members m LEFT JOIN "user" u ON u.id = m.user_id
      WHERE m.board_id = ?
    `)
    .all(boardId)
    .sort((a, b) => (a as BoardMemberRow).name.localeCompare((b as BoardMemberRow).name, "th")) as BoardMemberRow[];
}

// ---------- announcements ----------

/** ISO strings in UTC compare as text, the same way they're stored. */
const NOW_ISO = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

type AnnouncementRow = Omit<AnnouncementAdmin, "dismissible" | "active" | "tone"> & { dismissible: number; active: number; tone: string };

const toAnnouncementAdmin = (r: AnnouncementRow): AnnouncementAdmin => ({
  ...r,
  tone: isTone(r.tone) ? r.tone : "info",
  dismissible: !!r.dismissible,
  active: !!r.active,
});

export function listAnnouncements(): AnnouncementAdmin[] {
  return (db()
    .prepare(`
      SELECT a.*, (SELECT COUNT(*) FROM announcement_dismissals WHERE announcement_id = a.id) AS dismissed_count
      FROM announcements a ORDER BY a.created_at DESC, a.id DESC
    `)
    .all() as AnnouncementRow[]).map(toAnnouncementAdmin);
}

/** Live now and not hidden by this user; newest first. */
export function announcementsFor(userId: string): Announcement[] {
  return (db()
    .prepare(`
      SELECT a.id, a.title, a.body, a.tone, a.dismissible
      FROM announcements a
      WHERE a.active = 1
        AND (a.starts_at IS NULL OR a.starts_at <= ${NOW_ISO})
        AND (a.ends_at IS NULL OR a.ends_at > ${NOW_ISO})
        AND NOT (a.dismissible = 1 AND EXISTS (
          SELECT 1 FROM announcement_dismissals d WHERE d.announcement_id = a.id AND d.user_id = ?
        ))
      ORDER BY a.created_at DESC, a.id DESC
    `)
    .all(userId) as { id: number; title: string; body: string | null; tone: string; dismissible: number }[])
    .map((r) => ({ ...r, tone: isTone(r.tone) ? r.tone : "info", dismissible: !!r.dismissible }));
}

const announcementParams = (a: AnnouncementInput) => ({
  title: a.title,
  body: a.body,
  tone: a.tone,
  dismissible: a.dismissible ? 1 : 0,
  active: a.active ? 1 : 0,
  starts_at: a.starts_at,
  ends_at: a.ends_at,
});

export function createAnnouncement(a: AnnouncementInput) {
  return Number(db()
    .prepare(`INSERT INTO announcements (title, body, tone, dismissible, active, starts_at, ends_at)
              VALUES (@title, @body, @tone, @dismissible, @active, @starts_at, @ends_at)`)
    .run(announcementParams(a)).lastInsertRowid);
}

export function updateAnnouncement(id: number, a: AnnouncementInput) {
  return db()
    .prepare(`UPDATE announcements SET title = @title, body = @body, tone = @tone, dismissible = @dismissible,
                active = @active, starts_at = @starts_at, ends_at = @ends_at, updated_at = ${NOW_ISO} WHERE id = @id`)
    .run({ ...announcementParams(a), id }).changes > 0;
}

export function setAnnouncementActive(id: number, active: boolean) {
  db().prepare(`UPDATE announcements SET active = ?, updated_at = ${NOW_ISO} WHERE id = ?`).run(active ? 1 : 0, id);
}

/** Hidden ones come back for everyone (e.g. after the text changed a lot). */
export function resetDismissals(id: number) {
  db().prepare("DELETE FROM announcement_dismissals WHERE announcement_id = ?").run(id);
}

export function deleteAnnouncement(id: number) {
  db().prepare("DELETE FROM announcements WHERE id = ?").run(id);
}

/** Only dismissible, existing announcements can be hidden. */
export function dismissAnnouncement(id: number, userId: string) {
  db()
    .prepare(`INSERT OR IGNORE INTO announcement_dismissals (announcement_id, user_id)
              SELECT id, ? FROM announcements WHERE id = ? AND dismissible = 1`)
    .run(userId, id);
}

export function liveAnnouncementCount() {
  return (db()
    .prepare(`SELECT COUNT(*) AS n FROM announcements WHERE active = 1
              AND (starts_at IS NULL OR starts_at <= ${NOW_ISO}) AND (ends_at IS NULL OR ends_at > ${NOW_ISO})`)
    .get() as { n: number }).n;
}
