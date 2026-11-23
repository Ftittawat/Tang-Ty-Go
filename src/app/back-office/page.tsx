import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/app-nav";
import { ChevronRightIcon, ExclamationIcon } from "@/components/icons";
import { pillCls, surfaceCls } from "@/components/ui";
import { globalFeatures, overrideCounts, systemStats } from "@/lib/back-office-store";
import { FEATURE_KEYS, FEATURES } from "@/lib/features";
import { ownerPage } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "หลังบ้าน · Tang-Ty Go" };

function Stat({ label, value, hint, href }: { label: string; value: number; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-[28px] font-bold leading-none tabular-nums">{value.toLocaleString("th-TH")}</p>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </>
  );
  const cls = `${surfaceCls} block p-4`;
  return href ? <Link href={href} className={`${cls} transition hover:shadow-lift`}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Owner (ADMIN_EMAILS) only: counts across the app and which switches are off. */
export default async function BackOfficePage() {
  await ownerPage();
  const stats = systemStats();
  const flags = globalFeatures();
  const overrides = overrideCounts();
  // A switch is worth a look when it isn't at its usual setting, or some board sets it differently.
  const notable = FEATURE_KEYS.filter((k) => flags[k] !== FEATURES[k].default || (overrides[k as keyof typeof overrides] ?? 0) > 0);

  return (
    <>
      <PageTitle title="หลังบ้าน" subtitle="ภาพรวมทั้งระบบ เห็นเฉพาะเจ้าของระบบ" />

      {flags.maintenance && (
        <div className="flex gap-3 rounded-2xl bg-[#ff9500]/12 p-4 text-sm text-[#c93400]">
          <ExclamationIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold">เปิดโหมดปิดปรับปรุงอยู่</span> ทุกคนยกเว้นคุณเห็นหน้าปิดปรับปรุงเต็มจอ{" "}
            <Link href="/maintenance" className="font-medium underline">ดูหน้านั้น</Link>
            {" · "}
            <Link href="/back-office/features" className="font-medium underline">ปิดได้ที่หน้าฟีเจอร์</Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="ผู้ใช้" value={stats.users} hint={`ใช้งานใน 7 วัน ${stats.active_users} คน`} href="/back-office/users" />
        <Stat label="ถูกระงับ" value={stats.banned} href="/back-office/users" />
        <Stat label="บอร์ด" value={stats.boards} href="/back-office/boards" />
        <Stat label="ทริป" value={stats.trips} />
        <Stat label="แผนเที่ยว" value={stats.plans} />
        <Stat label="รายการค่าใช้จ่าย" value={stats.expenses} />
      </div>

      <section className={`${surfaceCls} p-5`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">สวิตช์ที่ไม่ได้อยู่ค่าปกติ</h2>
          <Link href="/back-office/features" className="flex items-center gap-0.5 text-sm font-medium text-sky-600 hover:underline">
            จัดการ<ChevronRightIcon className="size-4" />
          </Link>
        </div>
        {notable.length === 0 ? (
          <p className="text-sm text-slate-500">ทุกฟีเจอร์อยู่ค่าปกติ</p>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {notable.map((k) => {
              const n = overrides[k as keyof typeof overrides] ?? 0;
              return (
                <li key={k} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                  <span className="flex-1 font-medium">{FEATURES[k].label}</span>
                  {n > 0 && <span className={`${pillCls} bg-black/[0.05] py-0.5 text-slate-500`}>{n} บอร์ดตั้งแยก</span>}
                  <span className={`${pillCls} py-0.5 ${flags[k] ? "bg-[#34c759]/12 text-[#248a3d]" : "bg-[#ff3b30]/10 text-[#d70015]"}`}>
                    {flags[k] ? "เปิด" : "ปิด"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
