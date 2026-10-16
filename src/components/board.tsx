"use client";

import { startTransition, useCallback, useMemo, useOptimistic, useState } from "react";
import { moveTrip } from "@/app/actions";
import { TripCard } from "@/components/trip-card";
import { TripDialog } from "@/components/trip-dialog";
import { AppHeader } from "@/components/app-nav";
import { PlusIcon, SearchIcon } from "@/components/icons";
import { iconBtn, pageCls, primaryBtn } from "@/components/ui";

// iOS search-bar look: gray fill that turns white with a blue ring on focus.
const searchField =
  "rounded-xl bg-black/[0.05] px-3 py-2 text-sm outline-none transition placeholder:text-slate-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15";
import { categoryOf, daysUntil, STATUSES, type Member, type Status, type Trip } from "@/lib/trips";

type DialogState = { trip: Trip | null; status: Status } | null;

export function Board({
  trips, members, initialTripId,
}: {
  trips: Trip[];
  members: Member[];
  initialTripId?: number;
}) {
  const [optimistic, applyMove] = useOptimistic(trips, (cur, m: { id: number; status: Status }) =>
    cur.map((t) => (t.id === m.id ? { ...t, status: m.status } : t)),
  );
  const [query, setQuery] = useState("");
  const [person, setPerson] = useState("");
  // `/?trip=ID` (e.g. from a plan page) opens that trip's card.
  const [dialog, setDialog] = useState<DialogState>(() => {
    const t = trips.find((x) => x.id === initialTripId);
    return t ? { trip: t, status: t.status } : null;
  });
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);

  const names = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return optimistic.filter((t) => {
      const pid = Number(person);
      if (pid && t.owner_id !== pid && !t.participant_ids.includes(pid)) return false;
      if (!q) return true;
      const people = [t.owner_id, ...t.participant_ids].map((id) => (id === null ? undefined : names.get(id)));
      return [t.title, t.description, t.location, categoryOf(t.category).label, ...people]
        .some((f) => f?.toLowerCase().includes(q));
    });
  }, [optimistic, query, person, names]);

  const nextTrip = useMemo(
    () =>
      optimistic
        .filter((t) => t.status !== "done" && (daysUntil(t.start_date) ?? -1) >= 0)
        .sort((a, b) => a.start_date!.localeCompare(b.start_date!))[0],
    [optimistic],
  );

  const move = (id: number, status: Status) => {
    const t = optimistic.find((x) => x.id === id);
    if (!t || t.status === status) return;
    startTransition(async () => {
      applyMove({ id, status });
      await moveTrip(id, status);
    });
  };

  const closeDialog = useCallback(() => {
    setDialog(null);
    // Drop a `?trip=` deep link so a refresh doesn't reopen the card.
    if (window.location.search) window.history.replaceState(null, "", "/");
  }, []);

  const filters = (searchCls: string, selectCls: string) => (
    <>
      <label className={`relative ${searchCls}`}>
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาทริป สถานที่ คน…"
          aria-label="ค้นหา"
          className={`${searchField} w-full pl-9`}
        />
      </label>
      <select value={person} onChange={(e) => setPerson(e.target.value)} aria-label="กรองตามคน (เจ้าของหรือคนที่ไป)" className={`${searchField} ${selectCls}`}>
        <option value="">ทุกคน</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader below={<div className={`${pageCls} flex gap-2 pb-3 sm:hidden`}>{filters("min-w-0 flex-1", "w-28 shrink-0")}</div>}>
        <h1 className="sr-only">Tang-Ty Go — บอร์ดทริป</h1>
        {/* On phones the filters move to their own row (`below`) instead of squeezing in here. */}
        <div className="hidden gap-2 sm:flex">{filters("w-64", "w-36")}</div>
        <button onClick={() => setDialog({ trip: null, status: "todo" })} className={`${primaryBtn} max-sm:px-2.5`} aria-label="เพิ่มทริป">
          <PlusIcon className="size-4" />
          <span className="hidden sm:inline">เพิ่มทริป</span>
        </button>
      </AppHeader>

      {nextTrip && (
        <div className={`${pageCls} mt-5`}>
          <button
            onClick={() => setDialog({ trip: nextTrip, status: nextTrip.status })}
            className="relative flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-linear-to-br from-[#b9d6ff] via-[#e3eeff] to-[#bfeed2] px-5 py-4 text-left shadow-card ring-1 ring-black/[0.04] transition hover:shadow-lift sm:px-6"
          >
            <span aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-[#0a84ff]/35 blur-3xl" />
            <span aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 size-56 rounded-full bg-[#ffcc00]/25 blur-3xl" />
            <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-card ring-1 ring-black/[0.04]">
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

      <main className={`${pageCls} flex-1 py-5`}>
        <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {STATUSES.map((s) => {
            const items = visible.filter((t) => t.status === s.id);
            const isOver = overCol === s.id && dragId !== null;
            return (
              <section
                key={s.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overCol !== s.id) setOverCol(s.id);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = Number(e.dataTransfer.getData("text/plain"));
                  setOverCol(null);
                  setDragId(null);
                  if (id) move(id, s.id);
                }}
                className={`flex w-[85vw] max-w-sm shrink-0 snap-start flex-col rounded-[28px] bg-black/[0.035] p-2 transition sm:w-80 lg:w-auto lg:max-w-none ${
                  isOver ? `bg-white/60 ring-2 ${s.ring}` : ""
                }`}
              >
                <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-2">
                  <span className={`size-2.5 rounded-full ${s.dot}`} />
                  <h2 className="text-[15px] font-semibold">{s.label}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${s.soft} ${s.text}`}>{items.length}</span>
                  <button
                    onClick={() => setDialog({ trip: null, status: s.id })}
                    className={`${iconBtn} ml-auto size-8`}
                    title={`เพิ่มใน ${s.label}`}
                    aria-label={`เพิ่มทริปใน ${s.label}`}
                  >
                    <PlusIcon className="size-4" />
                  </button>
                </div>
                <p className="-mt-1.5 mb-2.5 px-2.5 pl-7 text-xs text-slate-500">{s.th}</p>

                <div className="flex flex-1 flex-col gap-2">
                  {items.map((t) => (
                    <TripCard
                      key={t.id}
                      trip={t}
                      names={names}
                      dragging={dragId === t.id}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
                      onOpen={() => setDialog({ trip: t, status: t.status })}
                      onMove={(status) => move(t.id, status)}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="rounded-[22px] border border-dashed border-black/10 px-3 py-8 text-center text-xs text-slate-400">
                      {query || person ? "ไม่มีทริปที่ตรงกับการค้นหา" : s.hint}
                    </p>
                  )}
                  <button
                    onClick={() => setDialog({ trip: null, status: s.id })}
                    className="mt-auto flex items-center gap-2 rounded-2xl px-2.5 py-2 text-left text-sm font-medium text-slate-500 transition hover:bg-white/70 hover:text-slate-900"
                  >
                    <span className="flex size-5 items-center justify-center rounded-full bg-slate-400/25 text-slate-600">
                      <PlusIcon className="size-3" />
                    </span>
                    เพิ่มทริป
                  </button>
                </div>
              </section>
            );
          })}
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
