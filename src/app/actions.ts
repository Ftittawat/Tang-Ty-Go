"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, createSessionValue, requireAuth, SESSION_COOKIE } from "@/lib/auth";
import * as store from "@/lib/db";
import type { TripInput } from "@/lib/db";
import { isCategory, isStatus, type Status } from "@/lib/trips";

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
    owner: text(form, "owner", 60),
    participants: text(form, "participants", 500),
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
