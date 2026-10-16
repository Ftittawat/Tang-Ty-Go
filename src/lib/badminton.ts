// Shared (client + server) badminton sign-up types and calendar helpers.

import { be, MONTHS_TH, MONTHS_TH_FULL } from "@/lib/trips";

export type BadmintonSession = {
  id: number;
  date: string; // YYYY-MM-DD — at most one session per day
  location: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  organizer_id: number | null; // who looks after / books the courts
  courts: number;
  player_ids: number[]; // in sign-up order
};

export const LOCATION_MAX = 200;
export const COURTS_MAX = 20;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const WEEKDAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const utc = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const isRealDate = (date: string) => DATE_RE.test(date) && iso(utc(date)) === date;

/** Today in Thailand as YYYY-MM-DD; the server itself may run in UTC. */
export function todayTH(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
}

/** "2026-10" + 1 → "2026-11" */
export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  return iso(new Date(Date.UTC(y, m - 1 + n, 1))).slice(0, 7);
}

/** Every day in a month view: whole weeks, Sunday first. */
export function monthGrid(month: string) {
  const first = utc(`${month}-01`);
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  const day = new Date(first);
  day.setUTCDate(1 - first.getUTCDay());
  const end = new Date(last);
  end.setUTCDate(last.getUTCDate() + 6 - last.getUTCDay());
  const days: string[] = [];
  for (; day <= end; day.setUTCDate(day.getUTCDate() + 1)) days.push(iso(day));
  return days;
}

/** "ตุลาคม 2569" */
export function formatMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS_TH_FULL[m - 1]} ${be(y)}`;
}

/** "ศ. 16 ต.ค. 69" */
export function formatDay(date: string) {
  const d = utc(date);
  return `${WEEKDAYS_TH[d.getUTCDay()]}. ${d.getUTCDate()} ${MONTHS_TH[d.getUTCMonth()]} ${String(be(d.getUTCFullYear())).slice(2)}`;
}

/** "2 ชม.", "1 ชม. 30 นาที" */
export function formatDuration(start: string, end: string) {
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const total = mins(end) - mins(start);
  if (total <= 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return [h && `${h} ชม.`, m && `${m} นาที`].filter(Boolean).join(" ");
}

export const mapsUrl = (place: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
