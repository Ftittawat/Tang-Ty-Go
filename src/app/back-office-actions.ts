"use server";

import { revalidatePath } from "next/cache";
import { ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX, isTone } from "@/lib/announcements";
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

// ---------- announcements ----------

export type AnnouncementForm = {
  id?: number;
  title: string;
  body: string;
  tone: string;
  dismissible: boolean;
  active: boolean;
  /** ISO times from the browser (it knows the owner's time zone), or empty. */
  starts_at: string;
  ends_at: string;
};

const isoOrNull = (v: unknown) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
};

/** Announcements show on every page, so refresh everything. */
export async function saveAnnouncement(form: AnnouncementForm): Promise<string | null> {
  await requireOwner();
  const title = String(form.title ?? "").replace(/\s+/g, " ").trim();
  if (!title) return "ใส่หัวข้อประกาศด้วยนะ";
  if (title.length > ANNOUNCEMENT_TITLE_MAX) return `หัวข้อยาวเกิน ${ANNOUNCEMENT_TITLE_MAX} ตัวอักษร`;
  const body = String(form.body ?? "").trim() || null;
  if (body && body.length > ANNOUNCEMENT_BODY_MAX) return `รายละเอียดยาวเกิน ${ANNOUNCEMENT_BODY_MAX} ตัวอักษร`;
  if (!isTone(form.tone)) return "เลือกประเภทประกาศด้วยนะ";
  const starts_at = isoOrNull(form.starts_at);
  const ends_at = isoOrNull(form.ends_at);
  if (starts_at === undefined || ends_at === undefined) return "รูปแบบวันเวลาไม่ถูกต้อง";
  if (starts_at && ends_at && ends_at <= starts_at) return "เวลาสิ้นสุดต้องหลังเวลาเริ่ม";

  const input = { title, body, tone: form.tone, dismissible: !!form.dismissible, active: !!form.active, starts_at, ends_at };
  if (form.id) {
    if (!store.updateAnnouncement(Number(form.id), input)) return "ไม่พบประกาศนี้ อาจถูกลบไปแล้ว";
  } else {
    store.createAnnouncement(input);
  }
  refreshAll();
  return null;
}

export async function setAnnouncementActive(id: number, active: boolean) {
  await requireOwner();
  store.setAnnouncementActive(Number(id), !!active);
  refreshAll();
}

/** Shows it again to everyone who closed it. */
export async function resetAnnouncementDismissals(id: number) {
  await requireOwner();
  store.resetDismissals(Number(id));
  refreshAll();
}

export async function deleteAnnouncement(id: number) {
  await requireOwner();
  store.deleteAnnouncement(Number(id));
  refreshAll();
}
