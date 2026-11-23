import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions";
import { AppHeader, PageTitle } from "@/components/app-nav";
import { BoardCode, BoardNameForm, NicknameForm } from "@/components/board-settings";
import { BoardIcon, ChevronRightIcon, LogoutIcon, PeopleIcon } from "@/components/icons";
import { SwitchBoardButton } from "@/components/join-forms";
import { MembersManager } from "@/components/members-manager";
import { Avatar, ghostBtn, pageCls, pillCls, surfaceCls } from "@/components/ui";
import { listMembers, memberUsage } from "@/lib/db";
import { boardPage } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ตั้งค่า · Tang-Ty Go" };

function SectionTitle({ icon, title, subtitle, tint }: { icon: React.ReactNode; title: string; subtitle?: string; tint: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white ${tint}`}>{icon}</span>
      <div>
        <h2 className="font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const { viewer, board, me, boards } = await boardPage();
  const isAdmin = me.role === "admin";
  const others = boards.filter((b) => b.id !== board.id);

  return (
    <div className="min-h-screen">
      <AppHeader settings={false}>
        <form action={logout}>
          <button className={ghostBtn}><LogoutIcon className="size-4" />ออกจากระบบ</button>
        </form>
      </AppHeader>

      <main className={`${pageCls} py-6`}>
        <div className="mx-auto max-w-2xl space-y-6">
          <PageTitle title="ตั้งค่า" />

          <section className={`${surfaceCls} space-y-5 p-5 sm:p-6`}>
            <div className="flex items-center gap-3">
              {viewer.image ? (
                // Google profile photo; plain <img> since it's a tiny avatar from googleusercontent.com.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={viewer.image} alt="" referrerPolicy="no-referrer" className="size-11 shrink-0 rounded-full" />
              ) : (
                <Avatar name={me.name} className="size-11" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{me.name}</p>
                <p className="truncate text-sm text-slate-500">{viewer.email}</p>
              </div>
              <span className={`${pillCls} ${isAdmin ? "bg-[#ff9500]/12 text-[#c93400]" : "bg-black/5 text-slate-500"}`}>
                {isAdmin ? "แอดมิน" : "สมาชิก"}
              </span>
            </div>
            <NicknameForm key={me.name} memberId={me.id} name={me.name} />
          </section>

          <section className={`${surfaceCls} p-5 sm:p-6`}>
            <SectionTitle
              icon={<BoardIcon className="size-5" />}
              tint="bg-[#34c759]"
              title={board.name}
              subtitle={isAdmin ? "คุณเป็นแอดมินของบอร์ดนี้" : "บอร์ดที่เปิดอยู่"}
            />
            <div className="space-y-5">
              {isAdmin && <BoardNameForm key={board.name} name={board.name} />}
              {/* Everyone can share the code / invite link; only admins can reset it. */}
              <BoardCode code={board.code} canReset={isAdmin} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-black/6 pt-5">
              {others.map((b) => (
                <SwitchBoardButton key={b.id} id={b.id}>
                  สลับไป “{b.name}” <ChevronRightIcon className="size-4" />
                </SwitchBoardButton>
              ))}
              <Link href="/join" className={ghostBtn}>
                {viewer.isSystemAdmin ? "เข้าร่วม / สร้างบอร์ดอื่น" : "เข้าร่วมบอร์ดอื่น"}
              </Link>
              {viewer.isSystemAdmin && (
                <Link href="/back-office" className={ghostBtn}>
                  หลังบ้าน
                </Link>
              )}
            </div>
          </section>

          <section className={`${surfaceCls} p-5 sm:p-6`}>
            <SectionTitle
              icon={<PeopleIcon className="size-5" />}
              tint="bg-sky-600"
              title="รายชื่อสมาขิก"
              subtitle={
                isAdmin
                  ? "เพื่อนที่เข้าร่วมด้วยรหัสจะขึ้นที่นี่เอง"
                  : "เฉพาะแอดมินที่เพิ่ม / แก้ไขรายชื่อคนอื่นได้"
              }
            />
            <MembersManager members={listMembers(board.id)} usage={memberUsage(board.id)} isAdmin={isAdmin} meId={me.id} />
          </section>
        </div>
      </main>
    </div>
  );
}
