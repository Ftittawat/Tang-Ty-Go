"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as store from "@/lib/db";
import { BOARD_NAME_MAX, MEMBER_NAME_MAX } from "@/lib/trips";
import { BOARD_COOKIE, requireAuth, requireBoardAdmin } from "@/lib/viewer";

export type FormState = { error?: string; at?: number } | null;

const cleanName = (raw: unknown) => String(raw ?? "").replace(/\s+/g, " ").trim();

async function openBoard(id: number) {
  (await cookies()).set(BOARD_COOKIE, String(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 365 * 24 * 3600,
    path: "/",
  });
}

/** Code box on /join → the board's join page. */
export async function findBoard(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAuth();
  const code = store.normalizeBoardCode(String(form.get("code") ?? ""));
  if (!code) return { error: "รหัสบอร์ดมี 8 ตัว เช่น K7QM-3XPA", at: Date.now() };
  if (!store.boardByCode(code)) {
    await new Promise((r) => setTimeout(r, 500)); // slow down guessing
    return { error: "ไม่พบบอร์ดนี้ — ตรวจรหัสอีกครั้ง หรือขอรหัสใหม่จากแอดมิน", at: Date.now() };
  }
  redirect(`/join/${code}`);
}

/** System admins (ADMIN_EMAILS) only. The creator then picks a nickname and joins as the board's admin. */
export async function createBoard(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireAuth();
  if (!viewer.isSystemAdmin) return { error: "เฉพาะแอดมินระบบที่สร้างบอร์ดได้", at: Date.now() };
  const name = cleanName(form.get("name"));
  if (!name) return { error: "ตั้งชื่อบอร์ดด้วยนะ", at: Date.now() };
  if (name.length > BOARD_NAME_MAX) return { error: `ชื่อบอร์ดยาวเกิน ${BOARD_NAME_MAX} ตัวอักษร`, at: Date.now() };
  const board = store.createBoard(name);
  redirect(`/join/${board.code}`);
}

/** Join with the code: either a new nickname, or claim a name already on the board (keeps its trips / bills). */
export async function joinBoard(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireAuth();
  const code = store.normalizeBoardCode(String(form.get("code") ?? ""));
  const board = code ? store.boardByCode(code) : undefined;
  if (!board) return { error: "รหัสบอร์ดนี้ใช้ไม่ได้แล้ว — ขอรหัสใหม่จากแอดมิน", at: Date.now() };

  if (!store.boardsForUser(viewer.userId).some((b) => b.id === board.id)) {
    const role = viewer.isSystemAdmin ? "admin" : "member";
    const claimId = Number(form.get("claim_id")) || 0;
    if (claimId) {
      if (!store.joinBoard(board.id, viewer.userId, role, { claimId })) {
        return { error: "ชื่อนี้มีคนเลือกไปแล้ว — ลองรีเฟรชหน้า", at: Date.now() };
      }
    } else {
      const name = cleanName(form.get("name"));
      if (!name) return { error: "ใส่ชื่อเล่นของคุณด้วยนะ", at: Date.now() };
      if (name.length > MEMBER_NAME_MAX) return { error: `ชื่อยาวเกิน ${MEMBER_NAME_MAX} ตัวอักษร`, at: Date.now() };
      const clash = store.memberByName(board.id, name);
      if (clash) {
        return {
          error: clash.linked
            ? "มีคนใช้ชื่อนี้ในบอร์ดแล้ว — ลองชื่ออื่น"
            : "มีชื่อนี้ในบอร์ดอยู่แล้ว — ถ้าเป็นคุณ ให้กดเลือกชื่อนั้นด้านบน",
          at: Date.now(),
        };
      }
      store.joinBoard(board.id, viewer.userId, role, { name });
    }
  }
  await openBoard(board.id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function switchBoard(id: number) {
  const viewer = await requireAuth();
  if (!store.boardsForUser(viewer.userId).some((b) => b.id === id)) throw new Error("Not a member");
  await openBoard(id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function renameBoard(rawName: string): Promise<string | null> {
  const { board } = await requireBoardAdmin();
  const name = cleanName(rawName);
  if (!name) return "ชื่อบอร์ดห้ามว่าง";
  if (name.length > BOARD_NAME_MAX) return `ชื่อบอร์ดยาวเกิน ${BOARD_NAME_MAX} ตัวอักษร`;
  store.renameBoard(board.id, name);
  revalidatePath("/", "layout");
  return null;
}

/** New code: anyone holding the old code / link can't join any more (people already in stay). */
export async function resetBoardCode() {
  const { board } = await requireBoardAdmin();
  store.resetBoardCode(board.id);
  revalidatePath("/settings");
}
