import type { Metadata } from "next";
import { AnnouncementsManager } from "@/components/announcements-manager";
import { PageTitle } from "@/components/app-nav";
import { listAnnouncements } from "@/lib/back-office-store";
import { ownerPage } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ประกาศ · หลังบ้าน · Tang-Ty Go" };

/** Owner only: notices every signed-in user sees under the app header. */
export default async function AnnouncementsPage() {
  await ownerPage();
  return (
    <>
      <PageTitle title="ประกาศ" subtitle="แจ้งข่าวถึงผู้ใช้ทุกคน แสดงใต้แถบเมนูในทุกหน้าของแอป" />
      <AnnouncementsManager items={listAnnouncements()} />
    </>
  );
}
