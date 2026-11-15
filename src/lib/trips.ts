// Shared (client + server) trip types, constants and formatting helpers.

// Colors are iOS system colors: `dot` the accent (also the progress ticks), `soft` + `text` a tinted pill, `ring` the drop target.
export const STATUSES = [
  { id: "todo", label: "To-Do", th: "อยากไป", hint: "ไอเดีย / ที่อยากไป", dot: "bg-[#8e8e93]", soft: "bg-[#8e8e93]/12", text: "text-[#636366]", ring: "ring-[#8e8e93]/40" },
  { id: "in_progress", label: "In Progress", th: "กำลังวางแผน", hint: "จองตั๋ว หาที่พัก นัดวัน", dot: "bg-[#ff9500]", soft: "bg-[#ff9500]/12", text: "text-[#c93400]", ring: "ring-[#ff9500]/45" },
  { id: "ready", label: "Ready to Go", th: "รอวันออกเดินทาง", hint: "แพลนเสร็จแล้ว รอถึงวันจริง", dot: "bg-[#007aff]", soft: "bg-[#007aff]/10", text: "text-[#0066d6]", ring: "ring-[#007aff]/40" },
  { id: "done", label: "Done", th: "ไปมาแล้ว", hint: "เก็บเป็นความทรงจำ", dot: "bg-[#34c759]", soft: "bg-[#34c759]/12", text: "text-[#248a3d]", ring: "ring-[#34c759]/45" },
] as const;

export type Status = (typeof STATUSES)[number]["id"];
export const STATUS_IDS = STATUSES.map((s) => s.id) as Status[];
export const isStatus = (v: unknown): v is Status => STATUS_IDS.includes(v as Status);

export const CATEGORIES = [
  { id: "trip", label: "ทริปเที่ยว", emoji: "🧳" },
  { id: "beach", label: "ทะเล", emoji: "🏖️" },
  { id: "mountain", label: "ภูเขา / แคมป์", emoji: "⛺" },
  { id: "abroad", label: "ต่างประเทศ", emoji: "✈️" },
  { id: "food", label: "กินเที่ยว", emoji: "🍜" },
  { id: "event", label: "คอนเสิร์ต / อีเวนต์", emoji: "🎫" },
  { id: "activity", label: "กิจกรรม", emoji: "🎯" },
  { id: "other", label: "อื่นๆ", emoji: "📌" },
] as const;

export type Category = (typeof CATEGORIES)[number]["id"];
export const isCategory = (v: unknown): v is Category => CATEGORIES.some((c) => c.id === v);
export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

export type Trip = {
  id: number;
  title: string;
  description: string | null;
  status: Status;
  category: Category;
  location: string | null;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  target_month: number | null; // 1-12
  target_year: number | null; // ค.ศ.
  owner_id: number | null;
  participant_ids: number[];
  budget: number | null; // บาท / คน
  link: string | null;
  plan_id: number | null; // first itinerary linked to this trip, if any
  expense_total: number; // satang, sum of the trip's expenses
  created_at: string;
  updated_at: string;
};

export const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export const MONTHS_TH_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/** ค.ศ. → พ.ศ. */
export const be = (year: number) => year + 543;

function parseDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return { y, m, day };
}

/** "12–15 ธ.ค. 69", "30 ธ.ค. 69 – 2 ม.ค. 70" */
export function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return null;
  const fmt = (d: string, withYear = true) => {
    const { y, m, day } = parseDate(d);
    return `${day} ${MONTHS_TH[m - 1]}${withYear ? ` ${String(be(y)).slice(2)}` : ""}`;
  };
  if (!start || !end || start === end) return fmt((start ?? end)!);
  const a = parseDate(start);
  const b = parseDate(end);
  if (a.y === b.y && a.m === b.m) return `${a.day}–${b.day} ${MONTHS_TH[b.m - 1]} ${String(be(b.y)).slice(2)}`;
  if (a.y === b.y) return `${fmt(start, false)} – ${fmt(end)}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

/** "~ ธ.ค. 2569", "~ ปี 2570" */
export function formatTarget(month: number | null, year: number | null) {
  if (!year) return month ? `~ ${MONTHS_TH[month - 1]}` : null;
  return month ? `~ ${MONTHS_TH[month - 1]} ${be(year)}` : `~ ปี ${be(year)}`;
}

export function tripNights(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
  return days > 0 ? days : null;
}

/** Days from today (local) until the start date: 0 = today, negative = past. */
export function daysUntil(date: string | null, today = new Date()) {
  if (!date) return null;
  const { y, m, day } = parseDate(date);
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.UTC(y, m - 1, day) - t) / 86_400_000);
}

export const ROLES = [
  { id: "admin", label: "แอดมิน", hint: "จัดการรายชื่อ สิทธิ์ และรหัสบอร์ดได้" },
  { id: "member", label: "สมาชิก", hint: "ใช้บอร์ด แผนเที่ยว และหารบิลได้" },
] as const;

export type Role = (typeof ROLES)[number]["id"];
export const isRole = (v: unknown): v is Role => ROLES.some((r) => r.id === v);

/** A name on a board. `linked` = someone signed in as this name; unlinked names are just for trips / bills. */
export type Member = { id: number; name: string; linked: boolean; role: Role };

export type Board = { id: number; name: string; code: string };

export const BOARD_NAME_MAX = 60;

export const MEMBER_NAME_MAX = 40;

/** Sort key: real date first, then target month/year, then newest created. */
export function sortKey(t: Trip) {
  if (t.start_date) return t.start_date;
  if (t.target_year) return `${t.target_year}-${String(t.target_month ?? 12).padStart(2, "0")}-99`;
  return "9999";
}

/** Has a real date or at least a rough month / year. */
export const hasWhen = (t: Trip) => !!(t.start_date || t.target_year || t.target_month);

const pad = (n: number) => String(n).padStart(2, "0");
const localISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Last day the trip could still be happening ("YYYY-MM-DD"), or null if open-ended (month without year). */
function lastDay(t: Trip) {
  if (t.start_date) return t.end_date ?? t.start_date;
  if (!t.target_year) return null;
  const m = t.target_month ?? 12;
  return `${t.target_year}-${pad(m)}-${pad(new Date(t.target_year, m, 0).getDate())}`;
}

/**
 * Board sections: trips with a date / rough period (soonest first, then the ones already over,
 * most recent first) and trips with no date yet (newest idea first).
 */
export function groupByWhen(trips: Trip[], today = new Date()) {
  const now = localISO(today);
  const dated = trips.filter(hasWhen);
  const isPast = (t: Trip) => {
    const end = lastDay(t);
    return end !== null && end < now;
  };
  return {
    upcoming: dated
      .filter((t) => !isPast(t))
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || b.created_at.localeCompare(a.created_at)),
    past: dated.filter(isPast).sort((a, b) => lastDay(b)!.localeCompare(lastDay(a)!)),
    undated: trips.filter((t) => !hasWhen(t)).sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

const ymd = (iso: string) => iso.replaceAll("-", "");

function addDaysISO(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * "Add to Google Calendar" link for a trip with a real start date: opens the user's own Google
 * Calendar with an all-day event pre-filled (nothing is saved until they press Save there).
 * Google's end date is exclusive, hence the +1 day.
 */
export function googleCalendarUrl(t: Trip) {
  if (!t.start_date) return null;
  const end = addDaysISO(t.end_date ?? t.start_date, 1);
  const details = [t.description, t.link].filter(Boolean).join("\n\n");
  const params = new URLSearchParams({ action: "TEMPLATE", text: t.title, dates: `${ymd(t.start_date)}/${ymd(end)}` });
  if (details) params.set("details", details);
  if (t.location) params.set("location", t.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}
