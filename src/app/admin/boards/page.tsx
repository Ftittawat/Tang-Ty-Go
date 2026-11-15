import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminBoards } from "@/components/admin-boards";
import { AppHeader, PageTitle } from "@/components/app-nav";
import { pageCls } from "@/components/ui";
import { listAllBoards } from "@/lib/db";
import { getBoardContext, getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "บอร์ดทั้งหมด · Tang-Ty Go" };

/** System admins (ADMIN_EMAILS) only: every board in the app, with delete. */
export default async function AdminBoardsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.isSystemAdmin) notFound();
  const ctx = await getBoardContext();
  const boards = listAllBoards();

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className={`${pageCls} py-6`}>
        <div className="mx-auto max-w-3xl space-y-6">
          <PageTitle
            back={ctx ? { href: "/settings", label: "ตั้งค่า" } : { href: "/join", label: "เข้าร่วม / สร้างบอร์ด" }}
            title="บอร์ดทั้งหมด"
            subtitle={`${boards.length} บอร์ดในระบบ`}
          />
          <AdminBoards boards={boards} myBoardIds={ctx?.boards.map((b) => b.id) ?? []} currentBoardId={ctx?.board.id ?? null} />
        </div>
      </main>
    </div>
  );
}
