"use client";

import Link from "next/link";
import { useState } from "react";
import { AppNav } from "@/components/app-nav";
import { Modal } from "@/components/modal";
import { PlanForm } from "@/components/plan-form";
import { GearIcon, ghostBtn, primaryBtn } from "@/components/ui";
import type { PlanSummary } from "@/lib/plan-store";
import { dayDateLabel } from "@/lib/plans";
import { categoryOf, type Trip } from "@/lib/trips";

export function PlanList({ plans, trips }: { plans: PlanSummary[]; trips: Trip[] }) {
  const [creating, setCreating] = useState(false);
  const tripById = new Map(trips.map((t) => [t.id, t]));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <AppNav />
          <div className="ml-auto flex gap-2">
            <button onClick={() => setCreating(true)} className={primaryBtn} aria-label="สร้างแผน">
              <span className="text-base leading-none">+</span>
              <span className="hidden sm:inline">สร้างแผน</span>
            </button>
            <Link href="/settings" className={`${ghostBtn} px-2.5`} title="ตั้งค่า" aria-label="ตั้งค่า">
              <GearIcon />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-lg font-bold">แผนเที่ยว</h1>
        <p className="mb-4 text-sm text-slate-500">กำหนดการรายวันของแต่ละทริป — เวลา สถานที่ และเวลาเดินทางระหว่างจุด</p>

        {plans.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 px-6 py-12 text-center">
            <p className="text-3xl">🗺️</p>
            <p className="mt-2 font-medium">ยังไม่มีแผนเที่ยว</p>
            <p className="mt-1 text-sm text-slate-500">สร้างแผนใหม่ หรือกด “แผนเที่ยว” จากการ์ดทริปบนบอร์ด</p>
            <button onClick={() => setCreating(true)} className={`${primaryBtn} mt-4`}>+ สร้างแผน</button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {plans.map((p) => {
              const trip = p.trip_id ? tripById.get(p.trip_id) : undefined;
              const first = dayDateLabel(p.start_date, 1);
              const last = p.day_count > 1 ? dayDateLabel(p.start_date, p.day_count) : null;
              return (
                <li key={p.id}>
                  <Link
                    href={`/plans/${p.id}`}
                    className="block h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl leading-none" aria-hidden>{trip ? categoryOf(trip.category).emoji : "🗺️"}</span>
                      <h2 className="min-w-0 flex-1 font-semibold leading-snug">{p.title}</h2>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">
                      🗓️ {first ? `${first}${last ? ` – ${last}` : ""}` : "ยังไม่กำหนดวัน"} · {p.day_count} วัน
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      📌 {p.activity_count} กิจกรรม
                      {trip && <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">🔗 {trip.title}</span>}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {creating && (
        <Modal title="สร้างแผนเที่ยว" onClose={() => setCreating(false)}>
          <PlanForm trips={trips} />
        </Modal>
      )}
    </div>
  );
}
