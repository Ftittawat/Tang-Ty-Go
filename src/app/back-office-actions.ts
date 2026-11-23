"use server";

import { revalidatePath } from "next/cache";
import { isSystemAdmin } from "@/lib/auth";
import * as store from "@/lib/back-office-store";
import { getBoard } from "@/lib/db";
import { isBoardFeatureKey, isFeatureKey } from "@/lib/features";
import { requireOwner } from "@/lib/viewer";

/** Switches change what every page shows, so refresh everything. */
const refreshAll = () => revalidatePath("/", "layout");

export async function setFeature(key: string, enabled: boolean): Promise<string | null> {
  await requireOwner();
  if (!isFeatureKey(key)) return "ไม่รู้จักสวิตช์นี้";
  store.setGlobalFeature(key, !!enabled);
  refreshAll();
  return null;
}

/** `null` = follow the whole-app switch. */
export async function setBoardFeature(boardId: number, key: string, enabled: boolean | null): Promise<string | null> {
  await requireOwner();
  if (!isBoardFeatureKey(key)) return "สวิตช์นี้ตั้งแยกรายบอร์ดไม่ได้";
  if (!getBoard(boardId)) return "ไม่พบบอร์ดนี้ อาจถูกลบไปแล้ว";
  store.setBoardFeature(boardId, key, enabled === null ? null : !!enabled);
  refreshAll();
  return null;
}

/** The owner's own accounts (ADMIN_EMAILS) can't be banned or deleted here. */
function guardTarget(id: string, ownerId: string): { error: string } | { user: store.AppUser } {
  const user = store.getUser(id);
  if (!user) return { error: "ไม่พบผู้ใช้นี้ อาจถูกลบไปแล้ว" };
  if (id === ownerId || isSystemAdmin(user.email)) return { error: "บัญชีเจ้าของระบบระงับหรือลบไม่ได้" };
  return { user };
}

export async function banUser(id: string, rawReason: string): Promise<string | null> {
  const owner = await requireOwner();
  const t = guardTarget(id, owner.userId);
  if ("error" in t) return t.error;
  const reason = String(rawReason ?? "").replace(/\s+/g, " ").trim().slice(0, 200) || null;
  store.banUser(id, reason);
  revalidatePath("/back-office", "layout");
  return null;
}

export async function unbanUser(id: string): Promise<string | null> {
  await requireOwner();
  store.unbanUser(id);
  revalidatePath("/back-office", "layout");
  return null;
}

/** The email must be typed back, since this can't be undone. */
export async function deleteUser(id: string, typedEmail: string): Promise<string | null> {
  const owner = await requireOwner();
  const t = guardTarget(id, owner.userId);
  if ("error" in t) return t.error;
  if (String(typedEmail ?? "").trim().toLowerCase() !== t.user.email.toLowerCase()) return "อีเมลไม่ตรง พิมพ์ให้ตรงทุกตัวอักษร";
  store.deleteUser(id);
  refreshAll();
  return null;
}
