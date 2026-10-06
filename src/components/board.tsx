"use client";

import { startTransition, useCallback, useMemo, useOptimistic, useState } from "react";
import { logout, moveTrip } from "@/app/actions";
import { TripCard } from "@/components/trip-card";
import { TripDialog } from "@/components/trip-dialog";
import { fieldCls, ghostBtn, Logo, primaryBtn } from "@/components/ui";
import { categoryOf, daysUntil, STATUSES, type Status, type Trip } from "@/lib/trips";

type DialogState = { trip: Trip | null; status: Status } | null;

export function Board({ trips }: { trips: Trip[] }) {
  const [optimistic, applyMove] = useOptimistic(trips, (cur, m: { id: number; status: Status }) =>
    cur.map((t) => (t.id === m.id ? { ...t, status: m.status } : t)),
  );
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);

  const owners = useMemo(
    () => [...new Set(trips.map((t) => t.owner).filter((o): o is string => !!o))].sort((a, b) => a.localeCompare(b, "th")),
    [trips],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return optimistic.filter((t) => {
      if (owner && t.owner !== owner) return false;
      if (!q) return true;
      return [t.title, t.description, t.location, t.owner, t.participants, categoryOf(t.category).label]
        .some((f) => f?.toLowerCase().includes(q));
    });
  }, [optimistic, query, owner]);

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

  const closeDialog = useCallback(() => setDialog(null), []);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Logo />
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">Tang-Ty Go</h1>
              <p className="hidden text-xs text-slate-500 sm:block">บอร์ดทริปและกิจกรรมของแก๊ง</p>
            </div>
          </div>

          <div className="order-last flex w-full gap-2 sm:order-none sm:ml-auto sm:w-auto">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาทริป สถานที่ คน…"
              aria-label="ค้นหา"
              className={`${fieldCls} min-w-0 flex-1 sm:w-64 sm:flex-none`}
            />
            <select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="กรองตามเจ้าของ" className={`${fieldCls} w-28 shrink-0 sm:w-36`}>
              <option value="">ทุกคน</option>
              {owners.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div className="ml-auto flex gap-2 sm:ml-0">
            <button onClick={() => setDialog({ trip: null, status: "todo" })} className={primaryBtn}>
              <span className="text-base leading-none">+</span> เพิ่มทริป
            </button>
            <form action={logout}>
              <button className={ghostBtn} title="ออกจากระบบ">ออก</button>
            </form>
          </div>
        </div>
      </header>

      {nextTrip && (
        <button
          onClick={() => setDialog({ trip: nextTrip, status: nextTrip.status })}
          className="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-[1400px] items-center gap-3 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 px-4 py-3 text-left text-white shadow-sm transition hover:brightness-110"
        >
          <span className="text-2xl">{categoryOf(nextTrip.category).emoji}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-sky-100">ทริปถัดไป</span>
            <span className="block truncate font-semibold">{nextTrip.title}{nextTrip.location && ` · ${nextTrip.location}`}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-2xl font-bold leading-none">{daysUntil(nextTrip.start_date) || "วันนี้!"}</span>
            {daysUntil(nextTrip.start_date) !== 0 && <span className="text-xs text-sky-100">วัน</span>}
          </span>
        </button>
      )}

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-4">
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
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
                className={`flex w-[85vw] max-w-sm shrink-0 snap-start flex-col rounded-2xl p-3 transition sm:w-80 lg:w-auto lg:max-w-none ${s.tint} ${
                  isOver ? `ring-2 ${s.ring}` : ""
                }`}
              >
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={`size-2.5 rounded-full ${s.dot}`} />
                  <h2 className="text-sm font-semibold">{s.label}</h2>
                  <span className="text-xs text-slate-500">{s.th}</span>
                  <span className="ml-auto rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-600">{items.length}</span>
                </div>

                <div className="flex flex-1 flex-col gap-2.5">
                  {items.map((t) => (
                    <TripCard
                      key={t.id}
                      trip={t}
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
                    <p className="rounded-xl border-2 border-dashed border-slate-300/70 px-3 py-6 text-center text-xs text-slate-400">
                      {query || owner ? "ไม่มีทริปที่ตรงกับการค้นหา" : s.hint}
                    </p>
                  )}
                  <button
                    onClick={() => setDialog({ trip: null, status: s.id })}
                    className="mt-auto rounded-lg px-2 py-1.5 text-left text-xs font-medium text-slate-500 transition hover:bg-white/70 hover:text-slate-800"
                  >
                    + เพิ่มใน {s.label}
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
          owners={owners}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
