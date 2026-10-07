"use client";

import { Avatar, AvatarStack } from "@/components/ui";
import {
  categoryOf, daysUntil, formatDateRange, formatTarget, STATUSES, tripNights, type Trip,
} from "@/lib/trips";

function Countdown({ trip }: { trip: Trip }) {
  if (trip.status === "done" || trip.status === "todo") return null;
  const d = daysUntil(trip.start_date);
  const end = daysUntil(trip.end_date);
  if (d === null) return null;
  if (d > 0) {
    return (
      <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white">
        อีก {d} วัน
      </span>
    );
  }
  if (end !== null && end >= 0) {
    return <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">กำลังเที่ยว 🎉</span>;
  }
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">ผ่านไปแล้ว — ย้ายไป Done?</span>;
}

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
  const people = trip.participant_ids
    .map((id) => names.get(id))
    .filter((n): n is string => !!n)
    .sort((a, b) => a.localeCompare(b, "th"));
  const idx = STATUSES.findIndex((s) => s.id === trip.status);
  const next = STATUSES[idx + 1];

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(trip.id));
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`group relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${
        dragging ? "opacity-40" : ""
      } ${trip.status === "done" ? "opacity-85" : ""}`}
    >
      <button type="button" onClick={onOpen} className="absolute inset-0 rounded-xl" aria-label={`เปิด ${trip.title}`} />

      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-lg leading-none" aria-hidden>{cat.emoji}</span>
        <h3 className={`min-w-0 flex-1 text-sm font-semibold leading-snug break-words ${trip.status === "done" ? "text-slate-600" : ""}`}>
          {trip.title}
        </h3>
        {owner && (
          <span title={`เจ้าของทริป: ${owner}`} className="relative">
            <Avatar name={owner} />
          </span>
        )}
      </div>

      {trip.description && <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">{trip.description}</p>}

      <dl className="mt-2 space-y-1 text-xs text-slate-600">
        {trip.location && (
          <div className="flex gap-1.5">
            <dt aria-label="สถานที่">📍</dt>
            <dd className="min-w-0 truncate">{trip.location}</dd>
          </div>
        )}
        {(dates || target) && (
          <div className="flex gap-1.5">
            <dt aria-label="วันที่">🗓️</dt>
            <dd>
              {dates ?? <span className="text-slate-500">{target}</span>}
              {days && days > 1 && <span className="text-slate-400"> · {days} วัน</span>}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Countdown trip={trip} />
        {trip.budget !== null && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
            ฿{trip.budget.toLocaleString("th-TH")}/คน
          </span>
        )}
        {people.length > 0 && <span className="relative"><AvatarStack names={people} /></span>}
        {trip.link && (
          <a
            href={trip.link}
            target="_blank"
            rel="noreferrer"
            className="relative rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-sky-700 hover:bg-sky-100"
          >
            🔗 ลิงก์
          </a>
        )}
        {next && (
          <button
            type="button"
            onClick={() => onMove(next.id)}
            className="relative ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
            title={`ย้ายไป ${next.label}`}
          >
            {next.label} →
          </button>
        )}
      </div>
    </article>
  );
}
