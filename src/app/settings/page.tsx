import type { Metadata } from "next";
import { logout } from "@/app/actions";
import { AppNav } from "@/components/app-nav";
import { MembersManager } from "@/components/members-manager";
import { ghostBtn } from "@/components/ui";
import { listMembers, memberUsage } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ตั้งค่า · Tang-Ty Go" };

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <AppNav />
          <form action={logout} className="ml-auto">
            <button className={ghostBtn}>ออกจากระบบ</button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <h1 className="text-lg font-bold">ตั้งค่า</h1>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">รายชื่อแก๊ง</h2>
          <p className="mb-4 text-sm text-slate-500">ใช้เลือกเจ้าของทริปและคนที่ไปในการ์ดแต่ละใบ</p>
          <MembersManager members={listMembers()} usage={memberUsage()} />
        </section>
      </main>
    </div>
  );
}
