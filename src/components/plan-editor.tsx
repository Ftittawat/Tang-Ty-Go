"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { deleteItem, deletePlan, moveItem } from "@/app/plan-actions";
import { AppHeader, PageTitle } from "@/components/app-nav";
import { ArrowDownIcon, ArrowUpIcon, CalendarIcon, ChevronRightIcon, ClockIcon, MapPinIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PlanForm } from "@/components/plan-form";
import { PlanItemForm, type ItemDraft } from "@/components/plan-item-form";
import { dangerBtn, ghostBtn, pageCls, surfaceCls } from "@/components/ui";
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
  const btn = "flex size-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30";
  return (
    <div
      className={`order-last -mb-1 ml-auto flex shrink-0 items-center sm:order-none sm:mb-0 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-within:opacity-100 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <button type="button" className={btn} disabled={isFirst || pending} onClick={() => start(() => moveItem(item.id, -1))} aria-label="เลื่อนขึ้น" title="เลื่อนขึ้น"><ArrowUpIcon className="size-3.5" /></button>
      <button type="button" className={btn} disabled={isLast || pending} onClick={() => start(() => moveItem(item.id, 1))} aria-label="เลื่อนลง" title="เลื่อนลง"><ArrowDownIcon className="size-3.5" /></button>
      <button type="button" className={btn} onClick={onEdit} aria-label="แก้ไข" title="แก้ไข"><PencilIcon className="size-3.5" /></button>
      <button
        type="button"
        className={`${btn} hover:bg-[#ff3b30]/10 hover:text-[#ff3b30]`}
        disabled={pending}
        onClick={() => confirm(`ลบ${label}?`) && start(() => deleteItem(item.id))}
        aria-label="ลบ"
        title="ลบ"
      >
        <TrashIcon className="size-3.5" />
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
        <span className={`relative mt-4 size-3 rounded-full ring-4 ring-[#f5f5f7] ${s.late ? "bg-[#ff3b30]" : "bg-sky-600"}`} />
      </div>
      <div className={`mb-2 flex min-w-0 flex-1 flex-wrap items-start gap-x-2 rounded-2xl bg-white p-3.5 shadow-card ring-1 ${s.late ? "ring-[#ff3b30]/40" : "ring-black/[0.04]"}`}>
        <ItemActions item={item} isFirst={isFirst} isLast={isLast} onEdit={onEdit} />
        <div className="min-w-0 basis-full sm:flex-1 sm:basis-0 sm:-order-1">
          <button type="button" onClick={onEdit} className="w-full text-left">
            <h3 className="font-semibold leading-normal break-words">{item.title}</h3>
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {formatDuration(item.duration_min) && <span className="flex items-center gap-1"><ClockIcon className="size-3.5 text-slate-400" />{formatDuration(item.duration_min)}</span>}
            {s.auto && <span className="text-slate-400" title="เริ่มต่อจากรายการก่อนหน้าอัตโนมัติ">↳ ต่อเนื่อง</span>}
            {item.location && (
              <a href={mapsUrl(item.location)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sky-600 hover:underline">
                <MapPinIcon className="size-3.5" />{item.location}
              </a>
            )}
          </div>
          {item.details && <p className="mt-2 text-sm whitespace-pre-line text-slate-600">{item.details}</p>}
          {s.late > 0 && prevEnd !== null && (
            <p className="mt-2 rounded-xl bg-[#ff3b30]/10 px-2.5 py-1.5 text-xs text-[#d70015]">
              ไม่ทัน — รายการก่อนหน้าจบ {formatTime(prevEnd)} ช้าไป {formatDuration(s.late)}
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
      <div className="mb-2 flex min-w-0 flex-1 flex-wrap items-start gap-x-2 rounded-2xl border border-dashed border-black/10 px-3.5 py-2 text-sm">
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
        <div className="mx-auto max-w-3xl">
          <PageTitle
            back={{ href: "/plans", label: "แผนทั้งหมด" }}
            title={plan.title}
            subtitle={
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-4 text-slate-400" />
                {first ? `${first}${last ? ` – ${last}` : ""}` : "ยังไม่กำหนดวัน"} · {plan.day_count} วัน
              </span>
            }
            actions={<button onClick={() => setEditingPlan(true)} className={ghostBtn}><PencilIcon className="size-4" />แก้ไขแผน</button>}
          />

          {trip && (
            <Link
              href={`/?trip=${trip.id}`}
              className={`${surfaceCls} mt-4 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition hover:shadow-lift`}
            >
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">{categoryOf(trip.category).emoji}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="text-slate-500">ทริป: </span>
                <span className="font-medium">{trip.title}</span>
                {formatDateRange(trip.start_date, trip.end_date) && <span className="text-slate-500"> · {formatDateRange(trip.start_date, trip.end_date)}</span>}
              </span>
              <span className="flex shrink-0 items-center text-xs font-medium text-sky-600">เปิดการ์ด<ChevronRightIcon className="size-3.5" /></span>
            </Link>
          )}

          {plan.note && <p className="mt-3 rounded-2xl bg-[#ffcc00]/15 px-3.5 py-2.5 text-sm whitespace-pre-line text-[#7a5c00]">{plan.note}</p>}

          {plan.day_count > 1 && (
            <nav className="sticky top-[61px] z-[5] -mx-4 mt-4 flex gap-1.5 overflow-x-auto bg-[#f5f5f7]/85 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6" aria-label="ไปยังวัน">
              {days.map((d) => (
                <a key={d.day} href={`#day-${d.day}`} className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-black/[0.06] transition hover:text-sky-600 hover:ring-sky-600/40">
                  วันที่ {d.day}
                </a>
              ))}
            </nav>
          )}

          <div className="mt-4 space-y-6">
            {days.map(({ day, scheduled, summary }) => {
              const lastEnd = scheduled.at(-1)?.end ?? null;
              return (
                <section key={day} id={`day-${day}`} className="scroll-mt-28 rounded-[28px] bg-black/[0.035] p-3 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-baseline gap-x-2">
                    <h2 className="text-[17px] font-semibold">วันที่ {day}</h2>
                    {dayDateLabel(plan.start_date, day) && <span className="text-sm text-slate-500">{dayDateLabel(plan.start_date, day)}</span>}
                    {summary.start !== null && (
                      <span className="ml-auto text-xs text-slate-500">
                        <Time min={summary.start} /> – <Time min={summary.end} />
                        {summary.travel > 0 && <> · เดินทางรวม {formatDuration(summary.travel)}</>}
                      </span>
                    )}
                  </div>

                  {scheduled.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-black/10 px-3 py-6 text-center text-sm text-slate-400">ยังไม่มีกำหนดการของวันนี้</p>
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
                                className="rounded-full px-2.5 py-0.5 text-xs text-slate-400 transition hover:bg-white hover:text-sky-600"
                              >
                                + เวลาเดินทาง
                              </button>
                            </Connector>
                          ),
                          s.gap > 0 && (
                            <Connector key={`g${s.item.id}`}>
                              <span className="text-xs text-[#248a3d]">☕ ว่าง {formatDuration(s.gap)}</span>
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
                      className="flex items-center gap-1.5 rounded-full bg-sky-600 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700"
                    >
                      <PlusIcon className="size-4" />กิจกรรม
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft({ kind: "travel", day, autoStart: lastEnd })}
                      disabled={scheduled.length === 0}
                      className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-black/[0.06] transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      <PlusIcon className="size-4" />เดินทาง
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
