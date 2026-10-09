"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, createSessionValue, requireAuth, SESSION_COOKIE } from "@/lib/auth";
import * as store from "@/lib/db";
import type { TripInput } from "@/lib/db";
import { AMOUNT_MAX, EXPENSE_TITLE_MAX, parseAmount } from "@/lib/expenses";
import { isCategory, isStatus, MEMBER_NAME_MAX, type Status } from "@/lib/trips";

export async function login(_prev: string | null, form: FormData) {
  if (!process.env.APP_PASSWORD) return "ยังไม่ได้ตั้งค่า APP_PASSWORD ในไฟล์ .env";
  if (!checkPassword(String(form.get("password") ?? ""))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return "รหัสผ่านไม่ถูกต้อง";
  }
  const { value, maxAge } = createSessionValue();
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/",
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export type TripFormState = { ok: boolean; error?: string; at?: number } | null;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(form: FormData, key: string, max = 500) {
  const v = String(form.get(key) ?? "").trim().slice(0, max);
  return v || null;
}

function int(form: FormData, key: string) {
  const raw = String(form.get(key) ?? "").replace(/[,\s]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

function parseTrip(form: FormData): TripInput | string {
  const title = text(form, "title", 120);
  if (!title) return "กรุณาใส่ชื่อทริป / กิจกรรม";

  const status = String(form.get("status") ?? "todo");
  const category = String(form.get("category") ?? "trip");
  if (!isStatus(status)) return "สถานะไม่ถูกต้อง";
  if (!isCategory(category)) return "ประเภทไม่ถูกต้อง";

  const start_date = text(form, "start_date", 10);
  let end_date = text(form, "end_date", 10);
  if ((start_date && !DATE_RE.test(start_date)) || (end_date && !DATE_RE.test(end_date))) return "รูปแบบวันที่ไม่ถูกต้อง";
  if (end_date && !start_date) return "ใส่วันเริ่มต้นด้วยนะ";
  if (start_date && end_date && end_date < start_date) return "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น";
  if (start_date && !end_date) end_date = start_date;

  const target_month = int(form, "target_month");
  const target_year = int(form, "target_year");
  if (target_month !== null && !(target_month >= 1 && target_month <= 12)) return "เดือนเป้าหมายไม่ถูกต้อง";
  if (target_year !== null && !(target_year >= 2000 && target_year <= 2200)) return "ปีเป้าหมายไม่ถูกต้อง";

  const memberIds = new Set(store.listMembers().map((m) => m.id));
  const owner_id = int(form, "owner_id");
  if (owner_id !== null && !memberIds.has(owner_id)) return "ไม่พบรายชื่อเจ้าของทริป — ลองรีเฟรชหน้า";
  const participant_ids = [...new Set(form.getAll("participant_ids").map(Number))].filter((id) => memberIds.has(id));

  const budget = int(form, "budget");
  if (budget !== null && !(budget >= 0)) return "งบประมาณต้องเป็นตัวเลข";

  let link = text(form, "link", 1000);
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  if (link) {
    try {
      new URL(link);
    } catch {
      return "ลิงก์ไม่ถูกต้อง";
    }
  }

  return {
    title,
    description: text(form, "description", 5000),
    status,
    category,
    location: text(form, "location", 200),
    start_date,
    end_date,
    target_month,
    target_year,
    owner_id,
    participant_ids,
    budget,
    link,
  };
}

export async function saveTrip(_prev: TripFormState, form: FormData): Promise<TripFormState> {
  await requireAuth();
  const input = parseTrip(form);
  if (typeof input === "string") return { ok: false, error: input };

  const id = Number(form.get("id"));
  if (id) store.updateTrip(id, input);
  else store.createTrip(input);

  revalidatePath("/");
  return { ok: true, at: Date.now() };
}

export async function moveTrip(id: number, status: Status) {
  await requireAuth();
  if (!isStatus(status)) throw new Error("Invalid status");
  store.setTripStatus(id, status);
  revalidatePath("/");
}

export async function removeTrip(id: number) {
  await requireAuth();
  store.deleteTrip(id);
  revalidatePath("/");
}

// ---------- members ----------

export type MemberFormState = { ok: boolean; message: string; at: number } | null;

function cleanName(raw: unknown) {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

export async function addMembers(_prev: MemberFormState, form: FormData): Promise<MemberFormState> {
  await requireAuth();
  // Accept several names at once: "ต้น, แบม" or one per line.
  const names = [...new Set(String(form.get("names") ?? "").split(/[,\n]/).map(cleanName).filter(Boolean))];
  if (names.length === 0) return { ok: false, message: "ใส่ชื่ออย่างน้อย 1 ชื่อ", at: Date.now() };
  const tooLong = names.find((n) => n.length > MEMBER_NAME_MAX);
  if (tooLong) return { ok: false, message: `ชื่อยาวเกิน ${MEMBER_NAME_MAX} ตัวอักษร: ${tooLong}`, at: Date.now() };

  const added = store.addMembers(names);
  revalidatePath("/", "layout");
  const skipped = names.length - added;
  return {
    ok: added > 0,
    message: added === 0 ? "มีชื่อนี้อยู่แล้ว" : `เพิ่ม ${added} คนแล้ว${skipped ? ` (ข้าม ${skipped} ชื่อที่มีอยู่แล้ว)` : ""}`,
    at: Date.now(),
  };
}

export async function renameMember(id: number, rawName: string): Promise<string | null> {
  await requireAuth();
  const name = cleanName(rawName);
  if (!name) return "ชื่อห้ามว่าง";
  if (name.length > MEMBER_NAME_MAX) return `ชื่อยาวเกิน ${MEMBER_NAME_MAX} ตัวอักษร`;
  const clash = store.listMembers().find((m) => m.id !== id && m.name.toLowerCase() === name.toLowerCase());
  if (clash) return "มีชื่อนี้อยู่แล้ว";
  store.renameMember(id, name);
  revalidatePath("/", "layout");
  return null;
}

export async function removeMember(id: number) {
  await requireAuth();
  store.deleteMember(id);
  revalidatePath("/", "layout");
}

// ---------- expenses ----------

export type ExpenseFormState = { ok: boolean; error?: string; at?: number } | null;

const expensesPath = (tripId: number) => `/trips/${tripId}/expenses`;

function revalidateExpenses(tripId: number) {
  revalidatePath(expensesPath(tripId));
  revalidatePath("/"); // card shows the trip total
}

function knownMembers(ids: unknown[]) {
  const all = new Set(store.listMembers().map((m) => m.id));
  return [...new Set(ids.map(Number))].filter((id) => all.has(id));
}

export async function saveExpense(_prev: ExpenseFormState, form: FormData): Promise<ExpenseFormState> {
  await requireAuth();
  const tripId = Number(form.get("trip_id"));
  if (!store.getTrip(tripId)) return { ok: false, error: "ไม่พบทริปนี้ — อาจถูกลบไปแล้ว" };

  const title = text(form, "title", EXPENSE_TITLE_MAX);
  if (!title) return { ok: false, error: "ใส่ชื่อรายการด้วยนะ" };

  const amount = parseAmount(String(form.get("amount") ?? ""));
  if (amount === null) return { ok: false, error: "ใส่จำนวนเงินด้วยนะ" };
  if (!(amount > 0 && amount <= AMOUNT_MAX)) return { ok: false, error: "จำนวนเงินไม่ถูกต้อง (ทศนิยมได้ไม่เกิน 2 ตำแหน่ง)" };

  const [payer_id] = knownMembers([form.get("payer_id")].filter(Boolean));
  if (payer_id === undefined) return { ok: false, error: "เลือกคนที่จ่ายด้วยนะ" };

  const split_all = form.get("split_all") === "1";
  const share_ids = knownMembers(form.getAll("share_ids"));
  if (!split_all && share_ids.length === 0) return { ok: false, error: "เลือกคนที่หารอย่างน้อย 1 คน" };

  const input = { title, amount, payer_id, split_all, share_ids };
  const id = Number(form.get("id"));
  if (id) {
    if (store.getExpense(id)?.trip_id !== tripId) return { ok: false, error: "ไม่พบรายการนี้ — ลองรีเฟรชหน้า" };
    store.updateExpense(id, input);
  } else {
    store.createExpense(tripId, input);
  }

  revalidateExpenses(tripId);
  return { ok: true, at: Date.now() };
}

/** Tick / untick people straight from the table. */
export async function setExpenseShares(id: number, memberIds: number[]) {
  await requireAuth();
  const e = store.getExpense(id);
  if (!e) return;
  const ids = knownMembers(memberIds);
  if (ids.length === 0) return; // keep at least one sharer; the UI blocks this too
  store.setExpenseShares(id, ids);
  revalidateExpenses(e.trip_id);
}

export async function removeExpense(id: number) {
  await requireAuth();
  const e = store.getExpense(id);
  if (!e) return;
  store.deleteExpense(id);
  revalidateExpenses(e.trip_id);
}

export async function setSettled(tripId: number, memberId: number, settled: boolean) {
  await requireAuth();
  if (!store.getTrip(tripId) || knownMembers([memberId]).length === 0) return;
  store.setSettled(tripId, memberId, settled);
  revalidatePath(expensesPath(tripId));
}
