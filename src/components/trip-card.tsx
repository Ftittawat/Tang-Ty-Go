"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  BanknoteIcon, CalendarIcon, ChevronRightIcon, ExclamationIcon, LinkIcon, MapIcon, MapPinIcon, WalletIcon,
} from "@/components/icons";
import { AvatarStack, pillCls } from "@/components/ui";
import { formatBaht } from "@/lib/expenses";
import {
  categoryOf, daysUntil, formatDateRange, formatTarget, STATUSES, tripNights, type Trip,
} from "@/lib/trips";

type Meter = { label: string; value: string; pct: number; over?: boolean; hint: string };

/** The one progress line a card shows: trip underway › countdown to departure › budget spent. */
function meterOf(trip: Trip): Meter | null {
  const start = daysUntil(trip.start_date);
  const end = daysUntil(trip.end_date ?? trip.start_date);
  if (trip.status !== "done" && start !== null && start <= 0 && end !== null && end >= 0) {
    const total = tripNights(trip.start_date, trip.end_date) ?? 1;
    const day = 1 - start;
    return { label: "กำลังเที่ยว", value: `วันที่ ${day}/${total}`, pct: day / total, hint: "วันที่ของทริป" };
  }
  if ((trip.status === "in_progress" || trip.status === "ready") && start !== null && start > 0) {
    const waited = Math.max(0, -(daysUntil(trip.created_at.slice(0, 10)) ?? 0));
    return {
      label: "นับถอยหลัง",
      value: `อีก ${start} วัน`,
      pct: waited / (waited + start),
      hint: "เวลาที่ผ่านไปตั้งแต่สร้างการ์ดจนถึงวันเดินทาง",
    };
  }
  if (trip.budget && trip.expense_total > 0) {
    const pct = trip.expense_total / 100 / (trip.budget * Math.max(1, trip.participant_ids.length));
    return { label: "ใช้งบไป", value: `${Math.round(pct * 100)}%`, pct, over: pct > 1, hint: "ค่าใช้จ่ายเทียบกับงบ × จำนวนคนที่ไป" };
  }
  return null;
}

const TICKS = 36;

/** Tick-mark progress bar: filled ticks up to a taller "now" tick, the rest faint. */
function Ticks({ pct, accent }: { pct: number; accent: string }) {
  const filled = Math.round(Math.min(1, Math.max(0, pct)) * TICKS);
  return (
    <div className="mt-2 flex h-5 items-center justify-between" aria-hidden>
      {Array.from({ length: TICKS }, (_, i) => (
        <span
          key={i}
          className={`rounded-full ${
            i === filled - 1 ? `h-5 w-[3px] ${accent}` : i < filled ? `h-3 w-px ${accent}` : "h-3 w-px bg-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

function Meta({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

const footLink = "relative flex items-center gap-1 rounded-full px-1.5 py-0.5 -mx-1.5 transition hover:bg-slate-100 hover:text-slate-900";

export function TripCard({
  trip, names, onOpen, onMove, dragging, onDragStart, onDragEnd,
}: {
  trip: Trip;
  names: Map<number, string>;
  onOpen: () => void;
  onMove: (status: Trip["status"]) => void;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const cat = categoryOf(trip.category);
  const dates = formatDateRange(trip.start_date, trip.end_date);
  const days = tripNights(trip.start_date, trip.end_date);
  const target = formatTarget(trip.target_month, trip.target_year);
  const owner = trip.owner_id !== null ? names.get(trip.owner_id) : undefined;
  const others = trip.participant_ids
    .filter((id) => id !== trip.owner_id)
    .map((id) => names.get(id))
    .filter((n): n is string => !!n)
    .sort((a, b) => a.localeCompare(b, "th"));
  const people = owner ? [owner, ...others] : others;
  const idx = STATUSES.findIndex((s) => s.id === trip.status);
  const status = STATUSES[idx];
  const next = STATUSES[idx + 1];
  const meter = meterOf(trip);
  const end = daysUntil(trip.end_date ?? trip.start_date);
  const overdue = (trip.status === "in_progress" || trip.status === "ready") && end !== null && end < 0;
  const hasLinks = trip.budget !== null || trip.expense_total > 0 || trip.plan_id !== null || !!trip.link;

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(trip.id));
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`group relative rounded-[22px] bg-white p-4 shadow-card ring-1 ring-black/[0.04] transition duration-200 hover:-translate-y-0.5 hover:shadow-lift ${
        dragging ? "scale-[0.98] opacity-40" : ""
      }`}
    >
      <button type="button" onClick={onOpen} className="absolute inset-0 rounded-[22px]" aria-label={`เปิด ${trip.title}`} />

      <div className="flex items-center gap-2">
        <span className={`${pillCls} ${status.soft} ${status.text}`}>
          <span className={`size-1.5 rounded-full ${status.dot}`} />
          {cat.label}
        </span>
        {next && (
          <button
            type="button"
            onClick={() => onMove(next.id)}
            className="relative ml-auto flex items-center gap-0.5 rounded-full py-1 pl-2.5 pr-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
            title={`ย้ายไป ${next.label}`}
          >
            {next.label}
            <ChevronRightIcon className="size-3.5" />
          </button>
        )}
      </div>

      <h3 className={`mt-3 text-[15px] font-semibold leading-normal break-words ${trip.status === "done" ? "text-slate-600" : ""}`}>
        {trip.title}
      </h3>
      {trip.description && <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-slate-500">{trip.description}</p>}

      {(dates || target || trip.location) && (
        <div className="mt-3 flex flex-col gap-1 text-[13px] text-slate-600">
          {(dates || target) && (
            <Meta icon={<CalendarIcon className="size-4" />}>
              {dates ?? <span className="text-slate-500">{target}</span>}
              {days && days > 1 && <span className="text-slate-400"> · {days} วัน</span>}
            </Meta>
          )}
          {trip.location && <Meta icon={<MapPinIcon className="size-4" />}>{trip.location}</Meta>}
        </div>
      )}

      {meter && (
        <div className="mt-4" role="progressbar" aria-label={meter.label} aria-valuenow={Math.round(meter.pct * 100)} aria-valuetext={meter.value} title={meter.hint}>
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-slate-500">{meter.label}</span>
            <span className={`font-medium tabular-nums ${meter.over ? "text-[#ff3b30]" : status.text}`}>{meter.value}</span>
          </div>
          <Ticks pct={meter.pct} accent={meter.over ? "bg-[#ff3b30]" : status.dot} />
        </div>
      )}

      {overdue && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-[#ff9500]/10 px-2.5 py-1.5 text-xs font-medium text-[#c93400]">
          <ExclamationIcon className="size-3.5 shrink-0" />
          ผ่านไปแล้ว — ย้ายไป Done?
        </p>
      )}

      {(hasLinks || people.length > 0) && (
        <footer className="mt-4 flex items-center gap-3 border-t border-black/[0.05] pt-3 text-xs text-slate-500">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            {trip.budget !== null && (
              <span className="flex items-center gap-1" title="งบประมาณต่อคน">
                <WalletIcon className="size-4 text-slate-400" />฿{trip.budget.toLocaleString("th-TH")}/คน
              </span>
            )}
            {trip.expense_total > 0 && (
              <Link href={`/trips/${trip.id}/expenses`} title="ค่าใช้จ่าย / หารบิล" className={footLink}>
                <BanknoteIcon className="size-4 text-slate-400" />฿{formatBaht(trip.expense_total)}
              </Link>
            )}
            {trip.plan_id !== null && (
              <Link href={`/plans/${trip.plan_id}`} title="แผนเที่ยว" className={footLink}>
                <MapIcon className="size-4 text-slate-400" />แผน
              </Link>
            )}
            {trip.link && (
              <a href={trip.link} target="_blank" rel="noreferrer" title={trip.link} className={footLink}>
                <LinkIcon className="size-4 text-slate-400" />ลิงก์
              </a>
            )}
          </div>
          {people.length > 0 && (
            <span className="relative shrink-0" title={owner ? `เจ้าของทริป: ${owner}` : undefined}>
              <AvatarStack names={people} />
            </span>
          )}
        </footer>
      )}
    </article>
  );
}
