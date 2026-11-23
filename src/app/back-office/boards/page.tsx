import type { Metadata } from "next";
import { AdminBoards } from "@/components/admin-boards";
import { PageTitle } from "@/components/app-nav";
import { listAllBoards } from "@/lib/db";
import { getBoardContext, ownerPage } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "บอร์ด · หลังบ้าน · Tang-Ty Go" };

/** Owner (ADMIN_EMAILS) only: every board in the app, with settings and delete. */
export default async function BackOfficeBoardsPage() {
  await ownerPage();
  const ctx = await getBoardContext();
  const boards = listAllBoards();

  return (
    <>
      <PageTitle title="บอร์ดทั้งหมด" subtitle={`${boards.length} บอร์ดในระบบ`} />
      <AdminBoards boards={boards} myBoardIds={ctx?.boards.map((b) => b.id) ?? []} currentBoardId={ctx?.board.id ?? null} />
    </>
  );
}
