import type { Metadata } from "next";
import { logout } from "@/app/actions";
import { AppHeader } from "@/components/app-nav";
import { MembersManager } from "@/components/members-manager";
import { ghostBtn, pageCls } from "@/components/ui";
import { listMembers, memberUsage } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ตั้งค่า · Tang-Ty Go" };

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <AppHeader settings={false}>
        <form action={logout}>
          <button className={ghostBtn}>ออกจากระบบ</button>
        </form>
      </AppHeader>

      <main className={`${pageCls} py-6`}>
        <div className="max-w-2xl space-y-6">
          <h1 className="text-lg font-bold">ตั้งค่า</h1>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">รายชื่อแก๊ง</h2>
            <p className="mb-4 text-sm text-slate-500">ใช้เลือกเจ้าของทริปและคนที่ไปในการ์ดแต่ละใบ</p>
            <MembersManager members={listMembers()} usage={memberUsage()} />
          </section>
        </div>
      </main>
    </div>
  );
}
