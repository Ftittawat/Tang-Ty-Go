import type { Metadata } from "next";
import { logout } from "@/app/actions";
import { AppHeader, PageTitle } from "@/components/app-nav";
import { LogoutIcon, PeopleIcon } from "@/components/icons";
import { MembersManager } from "@/components/members-manager";
import { ghostBtn, pageCls, surfaceCls } from "@/components/ui";
import { listMembers, memberUsage } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ตั้งค่า · Tang-Ty Go" };

export default function SettingsPage() {
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
          <section className={`${surfaceCls} p-5 sm:p-6`}>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white">
                <PeopleIcon className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">รายชื่อแก๊ง</h2>
                <p className="text-sm text-slate-500">ใช้เลือกเจ้าของทริปและคนที่ไปในการ์ดแต่ละใบ</p>
              </div>
            </div>
            <MembersManager members={listMembers()} usage={memberUsage()} />
          </section>
        </div>
      </main>
    </div>
  );
}
