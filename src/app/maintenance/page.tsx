import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions";
import { ghostBtn, primaryBtn } from "@/components/ui";
import { globalFeatures } from "@/lib/back-office-store";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ปิดปรับปรุงชั่วคราว · Tang-Ty Go", robots: { index: false } };

/**
 * Full-screen page everyone but the owner gets for every URL while maintenance is on
 * (proxy.ts rewrites to here). The owner can open it directly to see what others see.
 */
export default async function MaintenancePage() {
  const viewer = await getViewer();
  const preview = !!viewer?.isSystemAdmin;
  const on = globalFeatures().maintenance;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-linear-to-b from-[#bcd8ff] via-[#eef2f8] to-[#ffe3b8] px-4 py-10">
      <span aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-144 -translate-x-1/2 rounded-full bg-sky-400/30 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 size-112 rounded-full bg-[#ff9500]/20 blur-3xl" />

      <div className="relative w-full max-w-2xl text-center">
        {/* Still from "Maintenance web" by Creanimasi Studio (LottieFiles, Lottie Simple License). Public file, so it loads during maintenance too. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/maintenance.svg" alt="" width={1511} height={760} className="mx-auto h-auto w-full max-w-lg" />
        <h1 className="mt-4 text-2xl font-bold sm:text-[32px]">ปิดปรับปรุงระบบชั่วคราว</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-slate-600">
          กำลังปรับปรุงระบบให้ดีขึ้น ข้อมูลทริปและบิลทั้งหมดยังอยู่ครบ อีกสักพักกลับมาใช้งานได้ตามปกติ
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {/* The proxy decides again: back to the app as soon as maintenance ends. */}
          <Link href="/" prefetch={false} className={primaryBtn}>ลองอีกครั้ง</Link>
        </div>

        <div className="mt-10 text-sm text-slate-500">
          {preview ? (
            <p className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl bg-white/70 px-4 py-2.5 ring-1 ring-black/5 backdrop-blur">
              <span>
                {on ? "คนอื่นทุกคนเห็นหน้านี้อยู่ · คุณยังใช้งานได้ในฐานะเจ้าของระบบ" : "ตัวอย่างหน้านี้ · ตอนนี้โหมดปิดปรับปรุงปิดอยู่"}
              </span>
              <Link href="/back-office/features" className="font-medium text-sky-600 hover:underline">ไปหลังบ้าน</Link>
            </p>
          ) : viewer ? (
            <form action={logout} className="inline-flex flex-wrap items-center justify-center gap-2">
              <span>เข้าสู่ระบบอยู่ในชื่อ {viewer.email}</span>
              <button className={`${ghostBtn} px-3 py-1.5 text-xs`}>ออกจากระบบ</button>
            </form>
          ) : (
            <Link href="/login?next=%2Fback-office" className="hover:text-slate-700 hover:underline">ผู้ดูแลระบบ เข้าสู่ระบบ</Link>
          )}
        </div>
      </div>
    </main>
  );
}
