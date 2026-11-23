import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/app-nav";
import { BoardFeatureControl } from "@/components/back-office";
import { Avatar, pillCls, surfaceCls } from "@/components/ui";
import { boardMembersWithEmail, boardOverrides, globalFeatures } from "@/lib/back-office-store";
import { getBoard } from "@/lib/db";
import { BOARD_FEATURE_KEYS, FEATURES } from "@/lib/features";
import { ownerPage } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/back-office/boards/[id]">): Promise<Metadata> {
  await ownerPage();
  const board = getBoard(Number((await props.params).id));
  return { title: `${board?.name ?? "ไม่พบบอร์ด"} · หลังบ้าน · Tang-Ty Go` };
}

/** Owner only: one board's feature overrides and who's on it. */
export default async function BoardSettingsPage(props: PageProps<"/back-office/boards/[id]">) {
  await ownerPage();
  const board = getBoard(Number((await props.params).id));
  if (!board) notFound();
  const global = globalFeatures();
  const overrides = boardOverrides(board.id);
  const members = boardMembersWithEmail(board.id);

  return (
    <>
      <PageTitle
        back={{ href: "/back-office/boards", label: "บอร์ดทั้งหมด" }}
        title={board.name}
        subtitle={<span className="font-mono">{board.code}</span>}
      />

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold text-slate-500">ฟีเจอร์ของบอร์ดนี้</h2>
        <ul className={`${surfaceCls} divide-y divide-black/[0.05] px-5`}>
          {BOARD_FEATURE_KEYS.map((k) => (
            <li key={k} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{FEATURES[k].label}</p>
                <p className="mt-0.5 text-sm text-slate-500">{FEATURES[k].description}</p>
              </div>
              <BoardFeatureControl
                boardId={board.id}
                featureKey={k}
                label={FEATURES[k].label}
                override={overrides[k] ?? null}
                globalOn={global[k]}
              />
            </li>
          ))}
        </ul>
        <p className="px-1 text-xs text-slate-500">“ตามระบบ” ใช้ค่าจากหน้าฟีเจอร์ ส่วน “เปิด / ปิด” ใช้กับบอร์ดนี้อย่างเดียว</p>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold text-slate-500">สมาชิก {members.length} คน</h2>
        <ul className={`${surfaceCls} divide-y divide-black/[0.05] px-5`}>
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <Avatar name={m.name} className="size-8 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.name}</p>
                <p className="truncate text-xs text-slate-500">{m.email ?? "ยังไม่มีใครเข้าสู่ระบบด้วยชื่อนี้"}</p>
              </div>
              {m.role === "admin" && m.email && <span className={`${pillCls} bg-[#ff9500]/12 py-0.5 text-[#c93400]`}>แอดมิน</span>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
