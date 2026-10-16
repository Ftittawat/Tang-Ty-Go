"use client";

import Link from "next/link";
import { useState } from "react";
import { AppHeader, PageTitle } from "@/components/app-nav";
import { CalendarIcon, ChevronRightIcon, ClockIcon, LinkIcon, MapIcon, PlusIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PlanForm } from "@/components/plan-form";
import { pageCls, primaryBtn, surfaceCls } from "@/components/ui";
import type { PlanSummary } from "@/lib/plan-store";
import { dayDateLabel } from "@/lib/plans";
import { categoryOf, type Trip } from "@/lib/trips";

export function PlanList({ plans, trips }: { plans: PlanSummary[]; trips: Trip[] }) {
  const [creating, setCreating] = useState(false);
  const tripById = new Map(trips.map((t) => [t.id, t]));

  return (
    <div className="min-h-screen">
      <AppHeader>
        <button onClick={() => setCreating(true)} className={`${primaryBtn} max-sm:px-2.5`} aria-label="สร้างแผน">
          <PlusIcon className="size-4" />
          <span className="hidden sm:inline">สร้างแผน</span>
        </button>
      </AppHeader>

      <main className={`${pageCls} py-6`}>
        <div className="mb-5">
          <PageTitle title="แผนเที่ยว" subtitle="กำหนดการรายวันของแต่ละทริป — เวลา สถานที่ และเวลาเดินทางระหว่างจุด" />
        </div>

        {plans.length === 0 ? (
          <div className={`${surfaceCls} max-w-2xl px-6 py-12 text-center`}>
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sky-600/10 text-sky-600">
              <MapIcon className="size-7" />
            </span>
            <p className="mt-3 font-semibold">ยังไม่มีแผนเที่ยว</p>
            <p className="mt-1 text-sm text-slate-500">สร้างแผนใหม่ หรือกด “แผนเที่ยว” จากการ์ดทริปบนบอร์ด</p>
            <button onClick={() => setCreating(true)} className={`${primaryBtn} mt-5`}><PlusIcon className="size-4" />สร้างแผน</button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {plans.map((p) => {
              const trip = p.trip_id ? tripById.get(p.trip_id) : undefined;
              const first = dayDateLabel(p.start_date, 1);
              const last = p.day_count > 1 ? dayDateLabel(p.start_date, p.day_count) : null;
              return (
                <li key={p.id}>
                  <Link
                    href={`/plans/${p.id}`}
                    className={`${surfaceCls} group flex h-full flex-col rounded-[22px] p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl" aria-hidden>
                        {trip ? categoryOf(trip.category).emoji : <MapIcon className="size-5 text-slate-500" />}
                      </span>
                      <h2 className="min-w-0 flex-1 pt-1.5 text-[15px] font-semibold leading-normal">{p.title}</h2>
                      <ChevronRightIcon className="mt-2.5 size-4 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
                    </div>
                    <div className="mt-3 flex flex-col gap-1 text-[13px] text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon className="size-4 text-slate-400" />
                        {first ? `${first}${last ? ` – ${last}` : ""}` : "ยังไม่กำหนดวัน"}<span className="text-slate-400">· {p.day_count} วัน</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ClockIcon className="size-4 text-slate-400" />
                        {p.activity_count} กิจกรรม
                      </span>
                    </div>
                    {trip && (
                      <p className="mt-auto pt-3">
                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-sky-600/10 px-2.5 py-1 text-xs font-medium text-sky-700">
                          <LinkIcon className="size-3.5 shrink-0" />
                          <span className="truncate">{trip.title}</span>
                        </span>
                      </p>
                    )}
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
