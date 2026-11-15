"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  BanknoteIcon, CalendarIcon, CalendarPlusIcon, LinkIcon, MapIcon, MapPinIcon, WalletIcon,
} from "@/components/icons";
import { AvatarStack, pillCls } from "@/components/ui";
import { formatBaht } from "@/lib/expenses";
import {
  be, categoryOf, daysUntil, formatDateRange, formatTarget, googleCalendarUrl, MONTHS_TH, STATUSES, tripNights, type Trip,
} from "@/lib/trips";

/** The countdown bar covers the last this-many days before a trip. */
const COUNTDOWN_DAYS = 90;

type Meter ={ label: string; value: string; pct: number; over?: boolean; hint: string };

/** The one progress line a card shows: trip underway › countdown to departure › budget spent. */
function meterOf(trip: Trip): Meter | null {
  const start = daysUntil(trip.start_date);
  const end = daysUntil(trip.end_date ?? trip.start_date);
  if (trip.status !== "done" && start !== null && start <= 0 && end !== null && end >= 0) {
    const total = tripNights(trip.start_date, trip.end_date) ?? 1;
    const day = 1 - start;
    return { label: "กำลังเที่ยว", value: `วันที่ ${day}/${total}`, pct: day / total, hint: "วันที่ของทริป" };
  }
  if (trip.status !== "done" && start !== null && start > 0) {
    // Same scale on every card: empty from COUNTDOWN_DAYS out, full on departure day.
    return {
      label: "นับถอยหลัง",
      value: `อีก ${start} วัน`,
      pct: Math.max(0, 1 - start / COUNTDOWN_DAYS),
      hint: `เต็มเมื่อถึงวันเดินทาง — เริ่มเติมเมื่อเหลือไม่เกิน ${COUNTDOWN_DAYS} วัน`,
    };
  }
  if (trip.budget && trip.expense_total > 0) {
    const pct = trip.expense_total / 100 / (trip.budget * Math.max(1, trip.participant_ids.length));
    return { label: "ใช้งบไป", value: `${Math.round(pct * 100)}%`, pct, over: pct > 1, hint: "ค่าใช้จ่ายเทียบกับงบ × จำนวนคนที่ไป" };
  }
  return null;
}

const TICKS = 48;

/** Tick-mark progress bar: filled ticks up to a taller "now" tick, the rest faint. */
function Ticks({ pct, accent }: { pct: number; accent: string }) {
  const filled = Math.round(Math.min(1, Math.max(0, pct)) * TICKS);
  return (
    <div className="mt-2 flex h-5 items-center justify-between" aria-hidden>
      {Array.from({ length: TICKS }, (_, i) => (
        <span
          key={i}
          className={`rounded-full ${
            i === filled - 1 ? `h-5 w-0.75 ${accent}` : i < filled ? `h-3 w-px ${accent}` : "h-3 w-px bg-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

/** Calendar-style tile on the left: the start date, the rough month / year, or the category emoji. */
function WhenTile({ trip, tint }: { trip: Trip; tint: string }) {
  const box = "flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl leading-none";
  if (trip.start_date) {
    const [y, m, d] = trip.start_date.split("-").map(Number);
    return (
      <span className={`${box} ${tint}`}>
        <span className="text-[11px] font-semibold">{MONTHS_TH[m - 1]}</span>
        <span className="mt-0.5 text-2xl font-bold tabular-nums">{d}</span>
        <span className="mt-0.5 text-[10px] opacity-70 tabular-nums">{String(be(y)).slice(2)}</span>
      </span>
    );
  }
  if (trip.target_month || trip.target_year) {
    return (
      <span className={`${box} border border-dashed border-black/15 bg-black/2 text-slate-600`}>
        <span className="text-[10px] font-medium text-slate-400">ประมาณ</span>
        <span className="mt-1 text-[15px] font-semibold">{trip.target_month ? MONTHS_TH[trip.target_month - 1] : "ปี"}</span>
        {trip.target_year && <span className="mt-0.5 text-[10px] text-slate-500 tabular-nums">{be(trip.target_year)}</span>}
      </span>
    );
  }
  return <span className={`${box} bg-black/4 text-[28px]`}>{categoryOf(trip.category).emoji}</span>;
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

/** One wide row on the board. `past` dims trips whose date has gone by. */
export function TripCard({ trip, names, onOpen, past = false }: { trip: Trip; names: Map<number, string>; onOpen: () => void; past?: boolean }) {
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
  const status = STATUSES.find((s) => s.id === trip.status) ?? STATUSES[0];
  const meter = past ? null : meterOf(trip);
  const calendarUrl = past ? null : googleCalendarUrl(trip);

  return (
    <article
      className={`group relative flex gap-4 rounded-[22px] p-4 shadow-card ring-1 ring-black/4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift sm:p-5 ${
        past ? "bg-white/60" : "bg-white"
      }`}
    >
      <button type="button" onClick={onOpen} className="absolute inset-0 rounded-[22px]" aria-label={`เปิด ${trip.title}`} />

      <WhenTile trip={trip} tint={`${status.soft} ${status.text}`} />

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`${pillCls} bg-black/4 py-0.5 text-slate-600`}>{cat.emoji} {cat.label}</span>
            <span className={`${pillCls} py-0.5 ${status.soft} ${status.text}`}>
              <span className={`size-1.5 rounded-full ${status.dot}`} />
              {status.th}
            </span>
          </div>
          <h3 className={`mt-1.5 text-[16px] font-semibold leading-normal wrap-break-word ${past ? "text-slate-500" : ""}`}>{trip.title}</h3>
          {trip.description && <p className="line-clamp-1 text-[13px] leading-relaxed text-slate-500">{trip.description}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-600">
            {(dates || target) && (
              <Meta icon={<CalendarIcon className="size-4" />}>
                {dates ?? <span className="text-slate-500">{target}</span>}
                {days && days > 1 && <span className="text-slate-400"> · {days} วัน</span>}
              </Meta>
            )}
            {trip.location && <Meta icon={<MapPinIcon className="size-4" />}>{trip.location}</Meta>}
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
            {calendarUrl && (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noreferrer"
                title="เพิ่มลงใน Google Calendar ของคุณ"
                className={`${footLink} font-medium text-sky-700 hover:bg-sky-600/10 hover:text-sky-800`}
              >
                <CalendarPlusIcon className="size-4" />Add to Calendar
              </a>
            )}
          </div>
        </div>

        {(meter || people.length > 0) && (
          <div className="flex shrink-0 flex-col gap-3 sm:w-80 sm:items-end lg:w-104">
            {meter && (
              <div
                className="w-full"
                role="progressbar"
                aria-label={meter.label}
                aria-valuenow={Math.round(meter.pct * 100)}
                aria-valuetext={meter.value}
                title={meter.hint}
              >
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="text-slate-500">{meter.label}</span>
                  <span className={`font-semibold tabular-nums ${meter.over ? "text-[#ff3b30]" : status.text}`}>{meter.value}</span>
                </div>
                <Ticks pct={meter.pct} accent={meter.over ? "bg-[#ff3b30]" : status.dot} />
              </div>
            )}
            {people.length > 0 && (
              <span className="relative shrink-0 self-end" title={owner ? `เจ้าของทริป: ${owner}` : undefined}>
                <AvatarStack names={people} />
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
