"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAuth } from "@/lib/auth";
import { requireBoard, requireBoardAdmin } from "@/lib/viewer";
import * as store from "@/lib/db";
import type { TripInput } from "@/lib/db";
import { AMOUNT_MAX, EXPENSE_TITLE_MAX, parseAmount } from "@/lib/expenses";
import { isCategory, isRole, isStatus, MEMBER_NAME_MAX } from "@/lib/trips";

export async function logout() {
  await getAuth().api.signOut({ headers: await headers() });
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

function parseTrip(form: FormData, boardId: number): TripInput | string {
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

  const memberIds = new Set(store.listMembers(boardId).map((m) => m.id));
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
  const { board } = await requireBoard();
  const input = parseTrip(form, board.id);
  if (typeof input === "string") return { ok: false, error: input };

  const id = Number(form.get("id"));
  if (id) {
    if (!store.getTrip(id, board.id)) return { ok: false, error: "ไม่พบทริปนี้ — อาจถูกลบไปแล้ว" };
    store.updateTrip(id, input);
  } else {
    store.createTrip(board.id, input);
  }

  revalidatePath("/");
  return { ok: true, at: Date.now() };
}

export async function removeTrip(id: number) {
  const { board } = await requireBoard();
  if (!store.getTrip(id, board.id)) return;
  store.deleteTrip(id);
  revalidatePath("/");
}

// ---------- members ----------

export type MemberFormState = { ok: boolean; message: string; at: number } | null;

function cleanName(raw: unknown) {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

/** Admins add names for friends who don't use the app (they can still be on trips / bills). */
export async function addMembers(_prev: MemberFormState, form: FormData): Promise<MemberFormState> {
  const { board } = await requireBoardAdmin();
  // Accept several names at once: "ต้น, แบม" or one per line.
  const names = [...new Set(String(form.get("names") ?? "").split(/[,\n]/).map(cleanName).filter(Boolean))];
  if (names.length === 0) return { ok: false, message: "ใส่ชื่ออย่างน้อย 1 ชื่อ", at: Date.now() };
  const tooLong = names.find((n) => n.length > MEMBER_NAME_MAX);
  if (tooLong) return { ok: false, message: `ชื่อยาวเกิน ${MEMBER_NAME_MAX} ตัวอักษร: ${tooLong}`, at: Date.now() };

  const added = store.addMembers(board.id, names);
  revalidatePath("/", "layout");
  const skipped = names.length - added;
  return {
    ok: added > 0,
    message: added ? `เพิ่ม ${added} คนแล้ว${skipped ? ` · ข้าม ${skipped} ชื่อที่มีอยู่แล้ว` : ""}` : "มีชื่อนี้อยู่แล้ว",
    at: Date.now(),
  };
}

export async function setMemberRole(id: number, role: string): Promise<string | null> {
  const { board } = await requireBoardAdmin();
  if (!isRole(role)) return "สิทธิ์ไม่ถูกต้อง";
  const m = store.getMember(id, board.id);
  if (!m) return "ไม่พบรายชื่อนี้ — ลองรีเฟรชหน้า";
  if (!m.linked) return "ชื่อนี้ยังไม่มีใครเข้าสู่ระบบ — ตั้งเป็นแอดมินไม่ได้";
  if (m.role === "admin" && role !== "admin" && store.countAdmins(board.id) <= 1) return "บอร์ดต้องมีแอดมินอย่างน้อย 1 คน";
  store.setMemberRole(id, role);
  revalidatePath("/", "layout");
  return null;
}

/** Admins can rename anyone; everyone can change their own nickname. */
export async function renameMember(id: number, rawName: string): Promise<string | null> {
  const { board, me } = await requireBoard();
  if (id !== me.id && me.role !== "admin") return "แก้ได้เฉพาะชื่อของตัวเอง";
  if (!store.getMember(id, board.id)) return "ไม่พบรายชื่อนี้ — ลองรีเฟรชหน้า";
  const name = cleanName(rawName);
  if (!name) return "ชื่อห้ามว่าง";
  if (name.length > MEMBER_NAME_MAX) return `ชื่อยาวเกิน ${MEMBER_NAME_MAX} ตัวอักษร`;
  const clash = store.memberByName(board.id, name);
  if (clash && clash.id !== id) return "มีคนใช้ชื่อนี้ในบอร์ดแล้ว";
  store.renameMember(id, name);
  revalidatePath("/", "layout");
  return null;
}

/** Removing a signed-in person takes them off the board (they'd need the code to come back). */
export async function removeMember(id: number) {
  const { board, me } = await requireBoardAdmin();
  if (id === me.id) throw new Error("Can't remove yourself");
  if (!store.getMember(id, board.id)) return;
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

function knownMembers(boardId: number, ids: unknown[]) {
  const all = new Set(store.listMembers(boardId).map((m) => m.id));
  return [...new Set(ids.map(Number))].filter((id) => all.has(id));
}

export async function saveExpense(_prev: ExpenseFormState, form: FormData): Promise<ExpenseFormState> {
  const { board } = await requireBoard();
  const tripId = Number(form.get("trip_id"));
  if (!store.getTrip(tripId, board.id)) return { ok: false, error: "ไม่พบทริปนี้ — อาจถูกลบไปแล้ว" };

  const title = text(form, "title", EXPENSE_TITLE_MAX);
  if (!title) return { ok: false, error: "ใส่ชื่อรายการด้วยนะ" };

  const amount = parseAmount(String(form.get("amount") ?? ""));
  if (amount === null) return { ok: false, error: "ใส่จำนวนเงินด้วยนะ" };
  if (!(amount > 0 && amount <= AMOUNT_MAX)) return { ok: false, error: "จำนวนเงินไม่ถูกต้อง (ทศนิยมได้ไม่เกิน 2 ตำแหน่ง)" };

  const [payer_id] = knownMembers(board.id, [form.get("payer_id")].filter(Boolean));
  if (payer_id === undefined) return { ok: false, error: "เลือกคนที่จ่ายด้วยนะ" };

  const split_all = form.get("split_all") === "1";
  const share_ids = knownMembers(board.id, form.getAll("share_ids"));
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
  const { board } = await requireBoard();
  const e = store.getExpense(id);
  if (!e || !store.getTrip(e.trip_id, board.id)) return;
  const ids = knownMembers(board.id, memberIds);
  if (ids.length === 0) return; // keep at least one sharer; the UI blocks this too
  store.setExpenseShares(id, ids);
  revalidateExpenses(e.trip_id);
}

export async function removeExpense(id: number) {
  const { board } = await requireBoard();
  const e = store.getExpense(id);
  if (!e || !store.getTrip(e.trip_id, board.id)) return;
  store.deleteExpense(id);
  revalidateExpenses(e.trip_id);
}

export async function setSettled(tripId: number, memberId: number, settled: boolean) {
  const { board } = await requireBoard();
  if (!store.getTrip(tripId, board.id) || knownMembers(board.id, [memberId]).length === 0) return;
  store.setSettled(tripId, memberId, settled);
  revalidatePath(expensesPath(tripId));
}
