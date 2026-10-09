"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { deleteItem, deletePlan, moveItem } from "@/app/plan-actions";
import { AppHeader } from "@/components/app-nav";
import { Modal } from "@/components/modal";
import { PlanForm } from "@/components/plan-form";
import { PlanItemForm, type ItemDraft } from "@/components/plan-item-form";
import { dangerBtn, ghostBtn, pageCls } from "@/components/ui";
import {
  dayDateLabel, dayOffset, daySummary, formatDuration, formatTime, mapsUrl, scheduleDay, travelModeOf,
  type Plan, type PlanItem, type ScheduledItem,
} from "@/lib/plans";
import { categoryOf, formatDateRange, type Trip } from "@/lib/trips";

function Time({ min, className = "" }: { min: number | null; className?: string }) {
  if (min === null) return <span className={`text-slate-300 ${className}`}>--:--</span>;
  const plus = dayOffset(min);
  return (
    <span className={`tabular-nums ${className}`}>
      {formatTime(min)}
      {plus > 0 && <sup className="ml-0.5 text-[10px] font-semibold text-amber-600">+{plus}</sup>}
    </span>
  );
}

function ItemActions({
  item, isFirst, isLast, onEdit,
}: {
  item: PlanItem;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const [pending, start] = useTransition();
  const label = item.kind === "travel" ? "การเดินทางนี้" : `“${item.title}”`;
  const btn = "rounded-md px-1.5 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30";
  return (
    <div
      className={`order-last -mb-1 ml-auto flex shrink-0 items-center sm:order-none sm:mb-0 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-within:opacity-100 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <button type="button" className={btn} disabled={isFirst || pending} onClick={() => start(() => moveItem(item.id, -1))} aria-label="เลื่อนขึ้น" title="เลื่อนขึ้น">↑</button>
      <button type="button" className={btn} disabled={isLast || pending} onClick={() => start(() => moveItem(item.id, 1))} aria-label="เลื่อนลง" title="เลื่อนลง">↓</button>
      <button type="button" className={btn} onClick={onEdit} aria-label="แก้ไข" title="แก้ไข">✎</button>
      <button
        type="button"
        className={`${btn} hover:bg-rose-50 hover:text-rose-600`}
        disabled={pending}
        onClick={() => confirm(`ลบ${label}?`) && start(() => deleteItem(item.id))}
        aria-label="ลบ"
        title="ลบ"
      >
        🗑
      </button>
    </div>
  );
}

function ActivityRow({
  s, prevEnd, isFirst, isLast, onEdit,
}: {
  s: ScheduledItem;
  prevEnd: number | null;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const { item } = s;
  return (
    <li className="group flex gap-2 sm:gap-3">
      <div className="w-11 shrink-0 pt-3 text-right leading-tight sm:w-14">
        <Time min={s.start} className="block text-sm font-semibold text-slate-800" />
        {s.end !== null && s.end !== s.start && <Time min={s.end} className="block text-xs text-slate-400" />}
      </div>
      <div className="relative flex w-4 shrink-0 justify-center">
        <span className="absolute inset-y-0 w-px bg-slate-200" />
        <span className={`relative mt-4 size-3 rounded-full ring-4 ring-white ${s.late ? "bg-rose-500" : "bg-sky-500"}`} />
      </div>
      <div className={`mb-2 flex min-w-0 flex-1 flex-wrap items-start gap-x-2 rounded-xl border bg-white p-3 shadow-sm ${s.late ? "border-rose-200" : "border-slate-200"}`}>
        <ItemActions item={item} isFirst={isFirst} isLast={isLast} onEdit={onEdit} />
        <div className="min-w-0 basis-full sm:flex-1 sm:basis-0 sm:-order-1">
          <button type="button" onClick={onEdit} className="w-full text-left">
            <h3 className="font-semibold leading-snug break-words">{item.title}</h3>
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {formatDuration(item.duration_min) && <span>⏱ {formatDuration(item.duration_min)}</span>}
            {s.auto && <span className="text-slate-400" title="เริ่มต่อจากรายการก่อนหน้าอัตโนมัติ">↳ ต่อเนื่อง</span>}
            {item.location && (
              <a href={mapsUrl(item.location)} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline">
                📍 {item.location}
              </a>
            )}
          </div>
          {item.details && <p className="mt-2 text-sm whitespace-pre-line text-slate-600">{item.details}</p>}
          {s.late > 0 && prevEnd !== null && (
            <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">
              ⚠️ ไม่ทัน — รายการก่อนหน้าจบ {formatTime(prevEnd)} ช้าไป {formatDuration(s.late)}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function TravelRow({
  s, isFirst, isLast, onEdit,
}: {
  s: ScheduledItem;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const { item } = s;
  const mode = travelModeOf(item.travel_mode);
  return (
    <li className="group flex gap-2 sm:gap-3">
      <div className="w-11 shrink-0 sm:w-14" />
      <div className="relative flex w-4 shrink-0 justify-center">
        <span className="absolute inset-y-0 border-l-2 border-dashed border-slate-300" />
      </div>
      <div className="mb-2 flex min-w-0 flex-1 flex-wrap items-start gap-x-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-3 py-2 text-sm">
        <button type="button" onClick={onEdit} className="min-w-0 basis-full text-left sm:flex-1 sm:basis-0">
          <span className="font-medium text-slate-700">
            {mode.emoji} {mode.label} · {formatDuration(item.duration_min)}
          </span>
          {s.start !== null && s.end !== null && (
            <span className="ml-2 text-xs text-slate-400">
              <Time min={s.start} />–<Time min={s.end} />
            </span>
          )}
          {item.title && <span className="block text-xs text-slate-500">{item.title}</span>}
          {item.details && <span className="block text-xs whitespace-pre-line text-slate-500">{item.details}</span>}
        </button>
        <ItemActions item={item} isFirst={isFirst} isLast={isLast} onEdit={onEdit} />
      </div>
    </li>
  );
}

function Connector({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 sm:gap-3">
      <div className="w-11 shrink-0 sm:w-14" />
      <div className="relative flex w-4 shrink-0 justify-center">
        <span className="absolute inset-y-0 w-px bg-slate-200" />
      </div>
      <div className="mb-2 flex-1">{children}</div>
    </li>
  );
}

export function PlanEditor({
  plan, items, trips,
}: {
  plan: Plan;
  items: PlanItem[];
  trips: Trip[];
}) {
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [editingPlan, setEditingPlan] = useState(false);
  const [deleting, startDelete] = useTransition();
  const trip = trips.find((t) => t.id === plan.trip_id);

  const days = useMemo(
    () =>
      Array.from({ length: plan.day_count }, (_, i) => {
        const day = i + 1;
        const scheduled = scheduleDay(items.filter((it) => it.day === day));
        return { day, scheduled, summary: daySummary(scheduled) };
      }),
    [items, plan.day_count],
  );

  const closeDraft = useCallback(() => setDraft(null), []);
  const closePlan = useCallback(() => setEditingPlan(false), []);
  const first = dayDateLabel(plan.start_date, 1);
  const last = plan.day_count > 1 ? dayDateLabel(plan.start_date, plan.day_count) : null;

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className={`${pageCls} py-5`}>
        <div className="max-w-3xl">
          <Link href="/plans" className="text-sm text-slate-500 hover:text-slate-800">← แผนทั้งหมด</Link>

          <div className="mt-2 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold leading-snug break-words">{plan.title}</h1>
              <p className="mt-1 text-sm text-slate-500">
                🗓️ {first ? `${first}${last ? ` – ${last}` : ""}` : "ยังไม่กำหนดวัน"} · {plan.day_count} วัน
              </p>
            </div>
            <button onClick={() => setEditingPlan(true)} className={`${ghostBtn} shrink-0`}>แก้ไขแผน</button>
          </div>

          {trip && (
            <Link
              href={`/?trip=${trip.id}`}
              className="mt-3 flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-900 transition hover:border-sky-200"
            >
              <span aria-hidden>{categoryOf(trip.category).emoji}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="text-sky-600">ทริป: </span>
                <span className="font-medium">{trip.title}</span>
                {formatDateRange(trip.start_date, trip.end_date) && <span className="text-sky-700"> · {formatDateRange(trip.start_date, trip.end_date)}</span>}
              </span>
              <span className="shrink-0 text-xs text-sky-600">เปิดการ์ด →</span>
            </Link>
          )}

          {plan.note && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm whitespace-pre-line text-amber-900">📝 {plan.note}</p>}

          {plan.day_count > 1 && (
            <nav className="sticky top-[61px] z-[5] -mx-4 mt-4 flex gap-1.5 overflow-x-auto bg-[#f4f7fb]/90 px-4 py-2 backdrop-blur" aria-label="ไปยังวัน">
              {days.map((d) => (
                <a key={d.day} href={`#day-${d.day}`} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-sky-300 hover:text-sky-700">
                  วันที่ {d.day}
                </a>
              ))}
            </nav>
          )}

          <div className="mt-4 space-y-6">
            {days.map(({ day, scheduled, summary }) => {
              const lastEnd = scheduled.at(-1)?.end ?? null;
              return (
                <section key={day} id={`day-${day}`} className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white/60 p-3 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-baseline gap-x-2">
                    <h2 className="font-bold">วันที่ {day}</h2>
                    {dayDateLabel(plan.start_date, day) && <span className="text-sm text-slate-500">{dayDateLabel(plan.start_date, day)}</span>}
                    {summary.start !== null && (
                      <span className="ml-auto text-xs text-slate-500">
                        <Time min={summary.start} /> – <Time min={summary.end} />
                        {summary.travel > 0 && <> · เดินทางรวม {formatDuration(summary.travel)}</>}
                      </span>
                    )}
                  </div>

                  {scheduled.length === 0 ? (
                    <p className="rounded-xl border-2 border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">ยังไม่มีกำหนดการของวันนี้</p>
                  ) : (
                    <ol>
                      {scheduled.map((s, i) => {
                        const prev = scheduled[i - 1];
                        const prevEnd = prev?.end ?? null;
                        const rowProps = {
                          s,
                          isFirst: i === 0,
                          isLast: i === scheduled.length - 1,
                          onEdit: () => setDraft({ item: s.item, kind: s.item.kind, day, autoStart: prevEnd }),
                        };
                        // Two activities back to back: offer to slot a travel leg between them.
                        const canInsertTravel = prev && prev.item.kind === "activity" && s.item.kind === "activity";
                        return [
                          canInsertTravel && (
                            <Connector key={`t${s.item.id}`}>
                              <button
                                type="button"
                                onClick={() => setDraft({ kind: "travel", day, beforeId: s.item.id, autoStart: prevEnd })}
                                className="rounded-md px-2 py-0.5 text-xs text-slate-400 transition hover:bg-sky-50 hover:text-sky-700"
                              >
                                + เวลาเดินทาง
                              </button>
                            </Connector>
                          ),
                          s.gap > 0 && (
                            <Connector key={`g${s.item.id}`}>
                              <span className="text-xs text-emerald-700">☕ ว่าง {formatDuration(s.gap)}</span>
                            </Connector>
                          ),
                          s.item.kind === "travel" ? (
                            <TravelRow key={s.item.id} {...rowProps} />
                          ) : (
                            <ActivityRow key={s.item.id} {...rowProps} prevEnd={prevEnd} />
                          ),
                        ];
                      })}
                    </ol>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2 sm:pl-[5.5rem]">
                    <button
                      type="button"
                      onClick={() => setDraft({ kind: "activity", day, autoStart: lastEnd })}
                      className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                    >
                      + กิจกรรม
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft({ kind: "travel", day, autoStart: lastEnd })}
                      disabled={scheduled.length === 0}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      + เดินทาง
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>

      {draft && (
        <Modal
          key={draft.item?.id ?? `${draft.kind}-${draft.day}-${draft.beforeId ?? "end"}`}
          title={`${draft.item ? "แก้ไข" : "เพิ่ม"}${draft.kind === "travel" ? "การเดินทาง" : "กิจกรรม"} · วันที่ ${draft.day}`}
          onClose={closeDraft}
        >
          <PlanItemForm planId={plan.id} dayCount={plan.day_count} startDate={plan.start_date} draft={draft} />
        </Modal>
      )}

      {editingPlan && (
        <Modal title="แก้ไขแผน" onClose={closePlan}>
          <PlanForm
            plan={plan}
            trips={trips}
            footerStart={
              <button
                type="button"
                disabled={deleting}
                onClick={() => confirm(`ลบแผน “${plan.title}” และกำหนดการทั้งหมด? กู้คืนไม่ได้นะ`) && startDelete(() => deletePlan(plan.id))}
                className={dangerBtn}
              >
                {deleting ? "กำลังลบ…" : "ลบแผน"}
              </button>
            }
          />
        </Modal>
      )}
    </div>
  );
}
