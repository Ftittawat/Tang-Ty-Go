"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { listTrips } from "@/lib/db";
import * as store from "@/lib/plan-store";
import { isTime, isTravelMode, MAX_DAYS, MAX_DURATION_MIN, type PlanItemKind } from "@/lib/plans";
import { tripNights } from "@/lib/trips";

export type PlanFormState = { ok: boolean; error?: string; at?: number } | null;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(form: FormData, key: string, max = 500) {
  const v = String(form.get(key) ?? "").trim().slice(0, max);
  return v || null;
}

function int(form: FormData, key: string) {
  const raw = String(form.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : NaN;
}

function revalidatePlans(id?: number) {
  revalidatePath("/plans");
  if (id) revalidatePath(`/plans/${id}`);
  revalidatePath("/"); // trip cards show a plan chip
}

// ---------- plans ----------

function parsePlan(form: FormData): store.PlanInput | string {
  const title = text(form, "title", 120);
  if (!title) return "กรุณาใส่ชื่อแผน";

  const trip_id = int(form, "trip_id");
  if (trip_id !== null && !listTrips().some((t) => t.id === trip_id)) return "ไม่พบทริปที่เลือก — ลองรีเฟรชหน้า";

  const start_date = text(form, "start_date", 10);
  if (start_date && !DATE_RE.test(start_date)) return "รูปแบบวันที่ไม่ถูกต้อง";

  const day_count = int(form, "day_count") ?? 1;
  if (!(day_count >= 1 && day_count <= MAX_DAYS)) return `จำนวนวันต้องอยู่ระหว่าง 1–${MAX_DAYS}`;

  return { title, trip_id, start_date, day_count, note: text(form, "note", 5000) };
}

export async function createPlan(_prev: PlanFormState, form: FormData): Promise<PlanFormState> {
  await requireAuth();
  const input = parsePlan(form);
  if (typeof input === "string") return { ok: false, error: input };
  const id = store.createPlan(input);
  revalidatePlans();
  redirect(`/plans/${id}`);
}

/** Open the trip's plan, creating one from the trip's dates the first time. */
export async function openPlanForTrip(tripId: number) {
  await requireAuth();
  const existing = store.firstPlanForTrip(tripId);
  if (existing) redirect(`/plans/${existing.id}`);

  const trip = listTrips().find((t) => t.id === tripId);
  if (!trip) throw new Error("Trip not found");
  const id = store.createPlan({
    title: trip.title,
    trip_id: trip.id,
    start_date: trip.start_date,
    day_count: Math.min(tripNights(trip.start_date, trip.end_date) ?? 1, MAX_DAYS),
    note: null,
  });
  revalidatePlans();
  redirect(`/plans/${id}`);
}

export async function updatePlan(_prev: PlanFormState, form: FormData): Promise<PlanFormState> {
  await requireAuth();
  const id = Number(form.get("id"));
  if (!store.getPlan(id)) return { ok: false, error: "ไม่พบแผนนี้แล้ว" };
  const input = parsePlan(form);
  if (typeof input === "string") return { ok: false, error: input };

  const used = store.lastUsedDay(id);
  if (input.day_count < used) {
    return { ok: false, error: `วันที่ ${used} ยังมีกำหนดการอยู่ — ย้ายหรือลบก่อนลดจำนวนวัน` };
  }
  store.updatePlan(id, input);
  revalidatePlans(id);
  return { ok: true, at: Date.now() };
}

export async function deletePlan(id: number) {
  await requireAuth();
  store.deletePlan(id);
  revalidatePlans();
  redirect("/plans");
}

// ---------- items ----------

export async function saveItem(_prev: PlanFormState, form: FormData): Promise<PlanFormState> {
  await requireAuth();
  const planId = Number(form.get("plan_id"));
  const plan = store.getPlan(planId);
  if (!plan) return { ok: false, error: "ไม่พบแผนนี้แล้ว" };

  const kind = String(form.get("kind")) as PlanItemKind;
  if (kind !== "activity" && kind !== "travel") return { ok: false, error: "ประเภทรายการไม่ถูกต้อง" };

  const title = text(form, "title", 120);
  if (kind === "activity" && !title) return { ok: false, error: "กรุณาใส่ชื่อกิจกรรม" };

  const day = int(form, "day") ?? 1;
  if (!(day >= 1 && day <= plan.day_count)) return { ok: false, error: "วันไม่ถูกต้อง" };

  const start_time = kind === "activity" ? text(form, "start_time", 5) : null;
  if (start_time && !isTime(start_time)) return { ok: false, error: "รูปแบบเวลาไม่ถูกต้อง" };

  const duration_min = int(form, "duration_min");
  if (duration_min !== null && !(duration_min >= 0 && duration_min <= MAX_DURATION_MIN)) {
    return { ok: false, error: "ระยะเวลาไม่ถูกต้อง" };
  }
  if (kind === "travel" && !duration_min) return { ok: false, error: "ใส่เวลาเดินทางด้วยนะ" };

  const mode = String(form.get("travel_mode") ?? "");
  const travel_mode = kind === "travel" ? (isTravelMode(mode) ? mode : "car") : null;

  const input: store.ItemInput = {
    day,
    kind,
    title,
    details: text(form, "details", 5000),
    location: kind === "activity" ? text(form, "location", 200) : null,
    start_time,
    duration_min,
    travel_mode,
  };

  const id = Number(form.get("id"));
  if (id) {
    const cur = store.getItem(id);
    if (!cur || cur.plan_id !== planId) return { ok: false, error: "ไม่พบรายการนี้แล้ว" };
    store.updateItem(id, input);
  } else {
    store.createItem(planId, input, Number(form.get("before_id")) || undefined);
  }
  revalidatePlans(planId);
  return { ok: true, at: Date.now() };
}

export async function moveItem(id: number, dir: -1 | 1) {
  await requireAuth();
  const cur = store.getItem(id);
  if (!cur) return;
  store.moveItem(id, dir < 0 ? -1 : 1);
  revalidatePlans(cur.plan_id);
}

export async function deleteItem(id: number) {
  await requireAuth();
  const cur = store.getItem(id);
  if (!cur) return;
  store.deleteItem(id);
  revalidatePlans(cur.plan_id);
}
