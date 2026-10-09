// Shared (client + server) trip types, constants and formatting helpers.

export const STATUSES = [
  { id: "todo", label: "To-Do", th: "อยากไป", hint: "ไอเดีย / ที่อยากไป", dot: "bg-slate-400", ring: "ring-slate-300", tint: "bg-slate-100" },
  { id: "in_progress", label: "In Progress", th: "กำลังวางแผน", hint: "จองตั๋ว หาที่พัก นัดวัน", dot: "bg-amber-400", ring: "ring-amber-300", tint: "bg-amber-50" },
  { id: "ready", label: "Ready to Go", th: "รอวันออกเดินทาง", hint: "แพลนเสร็จแล้ว รอถึงวันจริง", dot: "bg-sky-500", ring: "ring-sky-300", tint: "bg-sky-50" },
  { id: "done", label: "Done", th: "ไปมาแล้ว", hint: "เก็บเป็นความทรงจำ", dot: "bg-emerald-500", ring: "ring-emerald-300", tint: "bg-emerald-50" },
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

export type Member = { id: number; name: string };

export const MEMBER_NAME_MAX = 40;

/** Sort key: real date first, then target month/year, then newest created. */
export function sortKey(t: Trip) {
  if (t.start_date) return t.start_date;
  if (t.target_year) return `${t.target_year}-${String(t.target_month ?? 12).padStart(2, "0")}-99`;
  return "9999";
}
