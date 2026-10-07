// Shared (client + server) itinerary types and time math.

export type Plan = {
  id: number;
  title: string;
  trip_id: number | null;
  start_date: string | null; // YYYY-MM-DD of day 1
  day_count: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanItemKind = "activity" | "travel";

export type PlanItem = {
  id: number;
  plan_id: number;
  day: number; // 1-based
  position: number;
  kind: PlanItemKind;
  title: string | null; // activity name (travel: optional label)
  details: string | null;
  location: string | null;
  start_time: string | null; // "HH:MM" — null = starts when the previous item ends
  duration_min: number | null;
  travel_mode: TravelMode | null;
};

export const TRAVEL_MODES = [
  { id: "car", label: "รถยนต์", emoji: "🚗" },
  { id: "taxi", label: "แท็กซี่ / Grab", emoji: "🚕" },
  { id: "walk", label: "เดิน", emoji: "🚶" },
  { id: "train", label: "รถไฟ / BTS / MRT", emoji: "🚆" },
  { id: "bus", label: "รถบัส / รถตู้", emoji: "🚌" },
  { id: "flight", label: "เครื่องบิน", emoji: "✈️" },
  { id: "boat", label: "เรือ", emoji: "⛴️" },
  { id: "other", label: "อื่นๆ", emoji: "🧭" },
] as const;

export type TravelMode = (typeof TRAVEL_MODES)[number]["id"];
export const isTravelMode = (v: unknown): v is TravelMode => TRAVEL_MODES.some((m) => m.id === v);
export const travelModeOf = (id: string | null) => TRAVEL_MODES.find((m) => m.id === id) ?? TRAVEL_MODES[0];

export const MAX_DAYS = 30;
export const MAX_DURATION_MIN = 24 * 60 * 3;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const isTime = (v: string) => TIME_RE.test(v);

/** "09:30" → 570 */
export function parseTime(v: string | null | undefined) {
  if (!v || !isTime(v)) return null;
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
}

/** 570 → "09:30"; past midnight wraps (1530 → "01:30"). */
export function formatTime(min: number) {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** How many midnights a minute-of-day value has crossed (for a "+1" marker). */
export const dayOffset = (min: number) => Math.floor(min / 1440);

/** 90 → "1 ชม. 30 นาที" */
export function formatDuration(min: number | null) {
  if (min === null || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h && `${h} ชม.`, m && `${m} นาที`].filter(Boolean).join(" ");
}

export type ScheduledItem = {
  item: PlanItem;
  start: number | null; // minutes from 00:00 of that day (may exceed 1440)
  end: number | null;
  auto: boolean; // start was derived from the previous item
  late: number; // fixed start is this many minutes before the previous item ends
  gap: number; // free minutes before a fixed start
};

/** Walk a day's items in order, chaining each start from the previous end. */
export function scheduleDay(items: PlanItem[]): ScheduledItem[] {
  let cursor: number | null = null;
  return items.map((item) => {
    const fixed = item.kind === "activity" ? parseTime(item.start_time) : null;
    const start = fixed ?? cursor;
    const late = fixed !== null && cursor !== null && cursor > fixed ? cursor - fixed : 0;
    const gap = fixed !== null && cursor !== null && fixed > cursor ? fixed - cursor : 0;
    const end = start === null ? null : start + (item.duration_min ?? 0);
    if (end !== null) cursor = end;
    return { item, start, end, auto: fixed === null && start !== null, late, gap };
  });
}

export function daySummary(scheduled: ScheduledItem[]) {
  const timed = scheduled.filter((s) => s.start !== null);
  const travel = scheduled
    .filter((s) => s.item.kind === "travel")
    .reduce((n, s) => n + (s.item.duration_min ?? 0), 0);
  return {
    start: timed[0]?.start ?? null,
    end: timed.at(-1)?.end ?? null,
    travel,
    activities: scheduled.filter((s) => s.item.kind === "activity").length,
  };
}

const WEEKDAYS_TH = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** Date of day N given day 1 = startDate, as "อา. 30 ธ.ค. 69". */
export function dayDateLabel(startDate: string | null, day: number) {
  if (!startDate) return null;
  const [y, m, d] = startDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + day - 1));
  return `${WEEKDAYS_TH[dt.getUTCDay()]} ${dt.getUTCDate()} ${MONTHS_SHORT[dt.getUTCMonth()]} ${String(dt.getUTCFullYear() + 543).slice(2)}`;
}

/** Google Maps search link for a free-text place. */
export const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
