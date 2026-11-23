/** Announcements the owner posts in /back-office for every signed-in user. Plain data, safe for client components. */

export const TONES = [
  { id: "info", label: "ข่าวสาร" },
  { id: "warning", label: "แจ้งเตือน" },
  { id: "success", label: "ของใหม่" },
] as const;

export type Tone = (typeof TONES)[number]["id"];
export const isTone = (v: unknown): v is Tone => TONES.some((t) => t.id === v);

export const ANNOUNCEMENT_TITLE_MAX = 80;
export const ANNOUNCEMENT_BODY_MAX = 500;

/** What users see in the app. */
export type Announcement = {
  id: number;
  title: string;
  body: string | null;
  tone: Tone;
  /** People can hide it for themselves with ✕. */
  dismissible: boolean;
};

/** What the owner manages in /back-office. */
export type AnnouncementAdmin = Announcement & {
  active: boolean;
  /** ISO time (UTC); shown from / until then. Null = no limit. */
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  /** How many people hid it. */
  dismissed_count: number;
};

export type AnnouncementInput = Pick<AnnouncementAdmin, "title" | "body" | "tone" | "dismissible" | "active" | "starts_at" | "ends_at">;

/** Where an announcement is in its life, for the back-office list. */
export function announcementStatus(a: Pick<AnnouncementAdmin, "active" | "starts_at" | "ends_at">, now = new Date().toISOString()) {
  if (!a.active) return "off" as const;
  if (a.ends_at && a.ends_at <= now) return "ended" as const;
  if (a.starts_at && a.starts_at > now) return "scheduled" as const;
  return "live" as const;
}
