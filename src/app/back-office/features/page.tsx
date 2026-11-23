import type { Metadata } from "next";
import { PageTitle } from "@/components/app-nav";
import { FeatureSwitch } from "@/components/back-office";
import { surfaceCls } from "@/components/ui";
import { globalFeatures, overrideCounts } from "@/lib/back-office-store";
import { FEATURE_KEYS, FEATURES, type FeatureKey } from "@/lib/features";
import { ownerPage } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ฟีเจอร์ · หลังบ้าน · Tang-Ty Go" };

function FeatureList({ keys, flags, overrides }: {
  keys: FeatureKey[];
  flags: Record<FeatureKey, boolean>;
  overrides: Partial<Record<string, number>>;
}) {
  return (
    <ul className={`${surfaceCls} divide-y divide-black/[0.05] px-5`}>
      {keys.map((k) => {
        const n = overrides[k] ?? 0;
        return (
          <li key={k} className="flex items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{FEATURES[k].label}</p>
              <p className="mt-0.5 text-sm text-slate-500">{FEATURES[k].description}</p>
              {n > 0 && <p className="mt-1 text-xs text-slate-400">{n} บอร์ดตั้งค่านี้แยกไว้ ไม่ได้ตามสวิตช์นี้</p>}
            </div>
            <FeatureSwitch featureKey={k} label={FEATURES[k].label} enabled={flags[k]} />
          </li>
        );
      })}
    </ul>
  );
}

/** Owner only: the whole-app switches. Boards can override the "board" ones on their own page. */
export default async function FeaturesPage() {
  await ownerPage();
  const flags = globalFeatures();
  const overrides = overrideCounts();
  const system = FEATURE_KEYS.filter((k) => FEATURES[k].scope === "global");
  const perBoard = FEATURE_KEYS.filter((k) => FEATURES[k].scope === "board");

  return (
    <>
      <PageTitle title="ฟีเจอร์" subtitle="เปิด / ปิดฟีเจอร์ทั้งระบบ มีผลทันทีกับทุกคน" />
      <div className="space-y-2">
        <h2 className="px-1 text-xs font-semibold text-slate-500">ระบบ</h2>
        <FeatureList keys={system} flags={flags} overrides={overrides} />
      </div>
      <div className="space-y-2">
        <h2 className="px-1 text-xs font-semibold text-slate-500">ฟีเจอร์ในบอร์ด</h2>
        <FeatureList keys={perBoard} flags={flags} overrides={overrides} />
        <p className="px-1 text-xs text-slate-500">ตั้งค่าแยกรายบอร์ดได้ที่ แท็บบอร์ด → ตั้งค่า</p>
      </div>
    </>
  );
}
