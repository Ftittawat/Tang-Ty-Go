import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions";
import { MembersManager } from "@/components/members-manager";
import { ghostBtn, Logo } from "@/components/ui";
import { listMembers, memberUsage } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ตั้งค่า · Tang-Ty Go" };

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg pr-2 transition hover:opacity-80" aria-label="กลับไปบอร์ด">
            <span className="text-lg text-slate-400" aria-hidden>←</span>
            <Logo />
            <span className="text-lg font-bold tracking-tight">ตั้งค่า</span>
          </Link>
          <form action={logout} className="ml-auto">
            <button className={ghostBtn}>ออกจากระบบ</button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">รายชื่อแก๊ง</h2>
          <p className="mb-4 text-sm text-slate-500">ใช้เลือกเจ้าของทริปและคนที่ไปในการ์ดแต่ละใบ</p>
          <MembersManager members={listMembers()} usage={memberUsage()} />
        </section>
      </main>
    </div>
  );
}
