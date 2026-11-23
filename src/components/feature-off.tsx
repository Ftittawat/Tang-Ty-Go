import Link from "next/link";
import { AppHeader } from "@/components/app-nav";
import { ghostBtn, pageCls, surfaceCls } from "@/components/ui";
import { FEATURES, type FeatureKey } from "@/lib/features";

/** Shown instead of a page whose feature the owner switched off (for the whole app or this board). */
export function FeatureOff({ feature }: { feature: FeatureKey }) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className={`${pageCls} py-6`}>
        <div className={`${surfaceCls} mx-auto max-w-md space-y-3 px-6 py-10 text-center`}>
          <p className="text-lg font-semibold">“{FEATURES[feature].label}” ปิดใช้งานอยู่</p>
          <p className="text-sm text-slate-500">ตอนนี้ยังใช้ส่วนนี้ไม่ได้ ถ้าต้องใช้ ติดต่อเจ้าของระบบ</p>
          <Link href="/" className={`${ghostBtn} mt-2`}>กลับไปที่บอร์ด</Link>
        </div>
      </main>
    </div>
  );
}
