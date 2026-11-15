"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { TripCard } from "@/components/trip-card";
import { TripDialog } from "@/components/trip-dialog";
import { AppHeader } from "@/components/app-nav";
import { CalendarIcon, PlusIcon } from "@/components/icons";
import { iconBtn, pageCls, primaryBtn } from "@/components/ui";
import { categoryOf, daysUntil, groupByWhen, type Member, type Status, type Trip } from "@/lib/trips";

type DialogState = { trip: Trip | null; status: Status } | null;

function Section({
  icon, title, hint, count, onAdd, children,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  count: number;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5 px-1">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-card ring-1 ring-black/4">{icon}</span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[17px] font-semibold">
            {title}
            <span className="rounded-full bg-black/6 px-2 py-0.5 text-xs font-semibold text-slate-500 tabular-nums">{count}</span>
          </h2>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
        <button onClick={onAdd} className={`${iconBtn} ml-auto`} title={`เพิ่มใน “${title}”`} aria-label={`เพิ่มทริปใน ${title}`}>
          <PlusIcon className="size-4" />
        </button>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

const emptyCls = "rounded-[22px] border border-dashed border-black/10 px-4 py-8 text-center text-sm text-slate-400";

export function Board({
  trips, members, initialTripId,
}: {
  trips: Trip[];
  members: Member[];
  initialTripId?: number;
}) {
  // `/?trip=ID` (e.g. from a plan page) opens that trip's card.
  const [dialog, setDialog] = useState<DialogState>(() => {
    const t = trips.find((x) => x.id === initialTripId);
    return t ? { trip: t, status: t.status } : null;
  });

  const names = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);

  const nextTrip = useMemo(
    () =>
      trips
        .filter((t) => t.status !== "done" && (daysUntil(t.start_date) ?? -1) >= 0)
        .sort((a, b) => a.start_date!.localeCompare(b.start_date!))[0],
    [trips],
  );

  const { upcoming, past, undated } = useMemo(() => groupByWhen(trips), [trips]);
  const add = () => setDialog({ trip: null, status: "todo" });
  const card = (t: Trip, past = false) => (
    <TripCard key={t.id} trip={t} names={names} past={past} onOpen={() => setDialog({ trip: t, status: t.status })} />
  );

  const closeDialog = useCallback(() => {
    setDialog(null);
    // Drop a `?trip=` deep link so a refresh doesn't reopen the card.
    if (window.location.search) window.history.replaceState(null, "", "/");
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader>
        <h1 className="sr-only">Tang-Ty Go — บอร์ดทริป</h1>
        <button onClick={add} className={`${primaryBtn} max-sm:px-2.5`} aria-label="เพิ่มทริป">
          <PlusIcon className="size-4" />
          <span className="hidden sm:inline">เพิ่มทริป</span>
        </button>
      </AppHeader>

      {nextTrip && (
        <div className={`${pageCls} mt-5`}>
          <button
            onClick={() => setDialog({ trip: nextTrip, status: nextTrip.status })}
            className="relative flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-linear-to-br from-[#b9d6ff] via-[#e3eeff] to-[#bfeed2] px-5 py-4 text-left shadow-card ring-1 ring-black/4 transition hover:shadow-lift sm:px-6"
          >
            <span aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-[#0a84ff]/35 blur-3xl" />
            <span aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 size-56 rounded-full bg-[#ffcc00]/25 blur-3xl" />
            <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-card ring-1 ring-black/4">
              {categoryOf(nextTrip.category).emoji}
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="block text-xs font-semibold text-sky-700">ทริปถัดไป</span>
              <span className="block truncate text-[17px] font-semibold leading-normal">{nextTrip.title}</span>
              {nextTrip.location && <span className="block truncate text-sm text-slate-600">{nextTrip.location}</span>}
            </span>
            <span className="relative shrink-0 text-right">
              {daysUntil(nextTrip.start_date) ? (
                <>
                  <span className="block text-4xl font-bold leading-none tracking-tight text-sky-700 tabular-nums">{daysUntil(nextTrip.start_date)}</span>
                  <span className="text-xs text-slate-600">วัน</span>
                </>
              ) : (
                <span className="text-xl font-bold text-sky-700">วันนี้!</span>
              )}
            </span>
          </button>
        </div>
      )}

      <main className={`${pageCls} flex-1 py-6`}>
        <div className="space-y-10">
          <Section
            icon={<CalendarIcon className="size-4" />}
            title="In Progress"
            hint="วันที่แน่นอน หรือช่วงคร่าวๆ"
            count={upcoming.length + past.length}
            onAdd={add}
          >
            {upcoming.map((t) => card(t))}
            {upcoming.length === 0 && (
              <p className={emptyCls}>ยังไม่มีทริปที่กำหนดวัน — ใส่วันที่หรือเดือนคร่าว ๆ ในการ์ดได้เลย</p>
            )}
            {past.length > 0 && (
              <>
                <p className="mt-4 flex items-center gap-3 px-1 text-xs font-medium text-slate-400">
                  ผ่านมาแล้ว<span className="h-px flex-1 bg-black/8" />
                </p>
                {past.map((t) => card(t, true))}
              </>
            )}
          </Section>

          <Section
            icon={<span className="text-base leading-none">💭</span>}
            title="To-Do"
            hint="ไอเดีย / ที่อยากไป / กิจกรรมที่อยากทำ"
            count={undated.length}
            onAdd={add}
          >
            {undated.map((t) => card(t))}
            {undated.length === 0 && (
              <p className={emptyCls}>ยังไม่มีไอเดีย — กด + เพื่อจดที่อยากไปไว้ก่อน</p>
            )}
          </Section>
        </div>
      </main>

      {dialog && (
        <TripDialog
          key={dialog.trip?.id ?? `new-${dialog.status}`}
          trip={dialog.trip}
          defaultStatus={dialog.status}
          members={members}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
