"use server";

/*
 * Public on purpose: the badminton page works without the app password (see proxy.ts), so these
 * actions skip requireAuth() and instead only ever touch badminton data and badminton-tagged names.
 */

import { revalidatePath } from "next/cache";
import {
  COURTS_MAX, formatDay, isRealDate, LOCATION_MAX, TIME_RE,
} from "@/lib/badminton";
import * as store from "@/lib/db";

export type BadmintonFormState = { ok: boolean; error?: string; id?: number; date?: string; at?: number } | null;

const PATH = "/badminton";

function badmintonMemberIds() {
  return new Set(store.listMembers().filter((m) => m.tags.includes("badminton")).map((m) => m.id));
}

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

const clashMessage = (date: string) => `${formatDay(date)} มีนัดตีแบดอยู่แล้ว — 1 วันนัดได้ 1 ครั้ง`;

export async function saveBadminton(_prev: BadmintonFormState, form: FormData): Promise<BadmintonFormState> {
  const fail = (error: string) => ({ ok: false, error });

  const date = str(form, "date");
  if (!isRealDate(date)) return fail("เลือกวันที่ด้วยนะ");

  const location = str(form, "location").replace(/\s+/g, " ").slice(0, LOCATION_MAX);
  if (!location) return fail("ใส่สถานที่ด้วยนะ");

  const start_time = str(form, "start_time");
  const end_time = str(form, "end_time");
  if (!TIME_RE.test(start_time) || !TIME_RE.test(end_time)) return fail("ใส่เวลาเริ่มและเวลาเลิกด้วยนะ");
  if (end_time <= start_time) return fail("เวลาเลิกต้องหลังเวลาเริ่ม");

  const courts = Number(str(form, "courts"));
  if (!(Number.isInteger(courts) && courts >= 1 && courts <= COURTS_MAX)) return fail(`จำนวนคอร์ดต้องอยู่ระหว่าง 1–${COURTS_MAX}`);

  const organizer_id = Number(str(form, "organizer_id"));
  if (!badmintonMemberIds().has(organizer_id)) return fail("เลือกคนดูแล / จองคอร์ดด้วยนะ");

  const input = { date, location, start_time, end_time, organizer_id, courts };
  let id = Number(form.get("id")) || 0;
  const taken = store.badmintonSessionOn(date);
  if (taken && taken.id !== id) return fail(clashMessage(date));

  try {
    if (id) {
      if (!store.getBadmintonSession(id)) return fail("ไม่พบนัดนี้ — อาจถูกลบไปแล้ว");
      store.updateBadmintonSession(id, input);
    } else {
      id = store.createBadmintonSession(input);
    }
  } catch (e) {
    // Someone else grabbed the same day between the check above and the write.
    if ((e as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") return fail(clashMessage(date));
    throw e;
  }

  revalidatePath(PATH);
  return { ok: true, id, date, at: Date.now() };
}

export async function removeBadminton(id: number) {
  store.deleteBadmintonSession(Number(id));
  revalidatePath(PATH);
}

export async function joinBadminton(sessionId: number, memberId: number) {
  if (!store.getBadmintonSession(Number(sessionId)) || !badmintonMemberIds().has(Number(memberId))) return;
  store.addBadmintonPlayer(Number(sessionId), Number(memberId));
  revalidatePath(PATH);
}

export async function leaveBadminton(sessionId: number, memberId: number) {
  store.removeBadmintonPlayer(Number(sessionId), Number(memberId));
  revalidatePath(PATH);
}
