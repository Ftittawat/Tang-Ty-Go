import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRightIcon } from "@/components/icons";
import { CodeForm, CreateBoardForm, SwitchBoardButton } from "@/components/join-forms";
import { OnboardingShell } from "@/components/onboarding-shell";
import { boardsForUser, listAllBoards } from "@/lib/db";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "เข้าร่วมบอร์ด · Tang-Ty Go" };

const rowCls = "flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-black/[0.06] transition hover:ring-black/15";

export default async function JoinPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const mine = boardsForUser(viewer.userId);
  const others = viewer.isSystemAdmin ? listAllBoards().filter((b) => !mine.some((m) => m.id === b.id)) : [];

  return (
    <OnboardingShell
      title={mine.length ? "บอร์ดของคุณ" : `สวัสดี ${viewer.name.split(" ")[0]}`}
      subtitle={mine.length ? "เลือกบอร์ด หรือใส่รหัสเพื่อเข้าร่วมบอร์ดอื่น" : "ใส่รหัสของบอร์ด เพื่อเข้าร่วม"}
      email={viewer.email}
    >
      {mine.length > 0 && (
        <ul className="space-y-2">
          {mine.map((b) => (
            <li key={b.id}>
              <SwitchBoardButton id={b.id} className={rowCls}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{b.name}</span>
                  <span className="block truncate text-xs text-slate-500">ในชื่อ {b.member_name}{b.role === "admin" ? " · แอดมิน" : ""}</span>
                </span>
                <ChevronRightIcon className="size-4 text-slate-400" />
              </SwitchBoardButton>
            </li>
          ))}
        </ul>
      )}

      <CodeForm />

      {viewer.isSystemAdmin && (
        <div className="space-y-4 border-t border-black/6 pt-5">
          <CreateBoardForm />
          {others.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-600">บอร์ดอื่นในระบบ (Admin only)</p>
              <ul className="space-y-2">
                {others.map((b) => (
                  <li key={b.id}>
                    <Link href={`/join/${b.code}`} className={rowCls}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{b.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          <span className="font-mono">{b.code}</span> · {b.member_count} คน · {b.trip_count} ทริป
                        </span>
                      </span>
                      <ChevronRightIcon className="size-4 text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </OnboardingShell>
  );
}
