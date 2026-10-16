"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition, useActionState, useEffect, useMemo, useOptimistic, useRef, useState, useTransition,
  type FormEvent, type ReactNode,
} from "react";
import { joinBadminton, leaveBadminton, removeBadminton, saveBadminton } from "@/app/badminton-actions";
import { AppHeader, PageTitle } from "@/components/app-nav";
import {
  ChevronLeftIcon, ChevronRightIcon, ClockIcon, CourtIcon, MapPinIcon, PencilIcon, PeopleIcon, PlusIcon,
  ShuttlecockIcon, XMarkIcon,
} from "@/components/icons";
import { Modal, useModalClose } from "@/components/modal";
import {
  Avatar, AvatarStack, dangerBtn, fieldCls, ghostBtn, iconBtn, inputCls, labelCls, MemberChip, pageCls, primaryBtn, surfaceCls,
} from "@/components/ui";
import {
  addMonths, COURTS_MAX, formatDay, formatDuration, formatMonth, LOCATION_MAX, mapsUrl, monthGrid, WEEKDAYS_TH,
  type BadmintonSession,
} from "@/lib/badminton";
import type { Member } from "@/lib/trips";

const ORGANIZER_KEY = "tg_badminton_organizer";
const PLACE_KEY = "tg_badminton_place";

function remembered(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** `key` stays the same when a new session is saved, so the open sheet switches to its details in place. */
type DialogState = ({ id: number } | { date: string }) & { key: number } | null;

export function BadmintonBoard({
  month, today, sessions, people,
}: {
  month: string; // YYYY-MM
  today: string; // YYYY-MM-DD, Thai time
  sessions: BadmintonSession[];
  /** Badminton-tagged names, plus anyone already on a session shown here. */
  people: Member[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const opened = useRef(0);
  const open = (d: { id: number } | { date: string }) => setDialog({ ...d, key: ++opened.current });

  const days = useMemo(() => monthGrid(month), [month]);
  const byDate = useMemo(() => new Map(sessions.map((s) => [s.date, s])), [sessions]);
  const names = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people]);
  const thisMonth = sessions.filter((s) => s.date.startsWith(month));

  const openDay = (date: string) => {
    const s = byDate.get(date);
    open(s ? { id: s.id } : { date });
  };

  // "+ เพิ่มรายการ": the first free day from today (or from the 1st when looking at another month).
  const newSession = () => {
    const from = today.startsWith(month) ? today : `${month}-01`;
    open({ date: days.find((d) => d >= from && d.startsWith(month) && !byDate.has(d)) ?? from });
  };

  const onSaved = (id: number, date: string) => {
    setDialog((d) => (d ? { id, key: d.key } : null));
    if (!date.startsWith(month)) router.push(`/badminton?m=${date.slice(0, 7)}`, { scroll: false });
  };

  const navBtn = `${iconBtn} size-8`;

  return (
    <div className="min-h-screen">
      <AppHeader tabs={false} settings={false}>
        <button onClick={newSession} className={`${primaryBtn} max-sm:px-2.5`} aria-label="เพิ่มรายการ">
          <PlusIcon className="size-4" />
          <span className="hidden sm:inline">เพิ่มรายการ</span>
        </button>
      </AppHeader>

      <main className={`${pageCls} py-6`}>
        <div className="mb-5">
          <PageTitle title="ตีแบด" subtitle="กดวันในปฏิทินเพื่อนัดหรือลงชื่อ — 1 วันนัดได้ 1 ครั้ง ไม่ต้องใช้รหัสผ่าน" />
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className={`${surfaceCls} overflow-hidden`}>
            <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
              <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>
              <div className="ml-auto flex items-center gap-1.5">
                <Link href={`/badminton?m=${addMonths(month, -1)}`} scroll={false} className={navBtn} aria-label="เดือนก่อน">
                  <ChevronLeftIcon className="size-4" />
                </Link>
                {!today.startsWith(month) && (
                  <Link href="/badminton" scroll={false} className={`${ghostBtn} px-3 py-1.5 text-xs`}>เดือนนี้</Link>
                )}
                <Link href={`/badminton?m=${addMonths(month, 1)}`} scroll={false} className={navBtn} aria-label="เดือนถัดไป">
                  <ChevronRightIcon className="size-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-7 border-y border-black/[0.06] bg-slate-50 text-center text-xs font-medium text-slate-500">
              {WEEKDAYS_TH.map((w, i) => (
                <span key={w} className={`py-2 ${i === 0 ? "text-[#ff3b30]/80" : ""}`}>{w}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-black/[0.06]">
              {days.map((d) => (
                <DayCell
                  key={d}
                  date={d}
                  session={byDate.get(d)}
                  outside={!d.startsWith(month)}
                  isToday={d === today}
                  past={d < today}
                  onClick={() => openDay(d)}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold text-slate-600">นัดในเดือนนี้ <span className="font-normal text-slate-400">({thisMonth.length})</span></h2>
            {thisMonth.length === 0 ? (
              <div className={`${surfaceCls} px-5 py-8 text-center`}>
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#34c759]/12 text-[#248a3d]">
                  <ShuttlecockIcon className="size-6" />
                </span>
                <p className="mt-3 text-sm text-slate-500">ยังไม่มีนัด — กดวันในปฏิทินหรือปุ่ม “เพิ่มรายการ” ได้เลย</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {thisMonth.map((s) => (
                  <li key={s.id}>
                    <SessionRow session={s} names={names} past={s.date < today} onClick={() => open({ id: s.id })} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      {dialog && (
        <SessionDialog
          key={dialog.key}
          session={"id" in dialog ? sessions.find((s) => s.id === dialog.id) : undefined}
          date={"date" in dialog ? dialog.date : ""}
          taken={byDate}
          people={people}
          names={names}
          onSaved={onSaved}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function DayCell({
  date, session, outside, isToday, past, onClick,
}: {
  date: string;
  session?: BadmintonSession;
  outside: boolean;
  isToday: boolean;
  past: boolean;
  onClick: () => void;
}) {
  const day = Number(date.slice(8));
  const label = session
    ? `${formatDay(date)} — ${session.start_time}–${session.end_time} ${session.location}, ลงชื่อ ${session.player_ids.length} คน`
    : `${formatDay(date)} — นัดตีแบด`;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group flex min-h-16 flex-col gap-1 p-1 text-left transition hover:bg-slate-50 sm:min-h-28 sm:p-1.5 ${
        outside ? "bg-slate-50/80" : "bg-white"
      }`}
    >
      <span
        className={`flex size-6 shrink-0 items-center justify-center self-center rounded-full text-xs tabular-nums sm:self-start sm:text-[13px] ${
          isToday ? "bg-sky-600 font-semibold text-white" : outside ? "text-slate-300" : past ? "text-slate-400" : "text-slate-700"
        }`}
      >
        {day}
      </span>
      {session ? (
        <span className={`block rounded-lg bg-[#34c759]/12 px-1 py-0.5 text-[#1f7a35] sm:px-2 sm:py-1.5 ${past || outside ? "opacity-60" : ""}`}>
          <span className="flex items-center justify-center gap-0.5 text-[11px] font-semibold tabular-nums sm:hidden">
            <PeopleIcon className="size-3" />{session.player_ids.length}
          </span>
          <span className="hidden sm:block">
            <span className="block truncate text-xs font-semibold tabular-nums">
              {session.start_time}<span className="hidden xl:inline">–{session.end_time}</span>
            </span>
            <span className="block truncate text-xs" title={session.location}>{session.location}</span>
            <span className="mt-1 flex items-center gap-2 text-[11px] text-[#248a3d] tabular-nums">
              <span className="flex items-center gap-0.5"><PeopleIcon className="size-3.5" />{session.player_ids.length}</span>
              <span className="flex items-center gap-0.5"><CourtIcon className="size-3.5" />{session.courts}</span>
            </span>
          </span>
        </span>
      ) : (
        !past && (
          <PlusIcon className="mt-auto hidden size-4 self-center text-slate-300 opacity-0 transition group-hover:opacity-100 sm:block" />
        )
      )}
    </button>
  );
}

function SessionRow({
  session: s, names, past, onClick,
}: {
  session: BadmintonSession;
  names: Map<number, string>;
  past: boolean;
  onClick: () => void;
}) {
  const players = s.player_ids.map((id) => names.get(id)).filter((n): n is string => !!n);
  const [, , day] = s.date.split("-").map(Number);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${surfaceCls} flex w-full items-center gap-3 rounded-[20px] p-3 text-left transition hover:shadow-lift ${past ? "opacity-60" : ""}`}
    >
      <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#34c759]/12 text-[#1f7a35]">
        <span className="text-[10px] font-medium leading-none">{formatDay(s.date).split(".")[0]}</span>
        <span className="text-lg font-bold leading-tight tabular-nums">{day}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold tabular-nums">{s.start_time}–{s.end_time}</span>
        <span className="block truncate text-xs text-slate-500">{s.location} · {s.courts} คอร์ด</span>
        <span className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
          {players.length > 0 && <AvatarStack names={players} max={5} />}
          {players.length} คน
        </span>
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-slate-300" />
    </button>
  );
}

function SessionDialog({
  session: live, date, taken, people, names, onSaved, onClose,
}: {
  session?: BadmintonSession;
  date: string;
  taken: Map<string, BadmintonSession>;
  people: Member[];
  names: Map<number, string>;
  onSaved: (id: number, date: string) => void;
  onClose: () => void;
}) {
  // Keep showing the last known copy while the page loads another month after a date change.
  const [kept, setKept] = useState(live);
  if (live && live !== kept) setKept(live);
  const session = live ?? kept;
  const [editing, setEditing] = useState(!session);

  const title = editing ? (session ? "แก้ไขนัดตีแบด" : "นัดตีแบดใหม่") : `ตีแบด · ${formatDay(session!.date)}`;
  return (
    <Modal title={title} onClose={onClose} size="max-w-lg">
      {editing || !session ? (
        <SessionForm
          session={session}
          date={date}
          taken={taken}
          players={people.filter((p) => p.tags.includes("badminton"))}
          onCancel={session ? () => setEditing(false) : undefined}
          onSaved={(id, d) => {
            setEditing(false);
            onSaved(id, d);
          }}
        />
      ) : (
        <SessionView session={session} people={people} names={names} onEdit={() => setEditing(true)} />
      )}
    </Modal>
  );
}

function InfoRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</span>
      <div className="min-w-0 flex-1 pt-1.5">{children}</div>
    </div>
  );
}

type PlayerChange = { type: "join" | "leave"; id: number };

function SessionView({
  session, people, names, onEdit,
}: {
  session: BadmintonSession;
  people: Member[];
  names: Map<number, string>;
  onEdit: () => void;
}) {
  const close = useModalClose();
  const [adding, setAdding] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [ids, change] = useOptimistic(session.player_ids, (cur: number[], c: PlayerChange) =>
    c.type === "join" ? (cur.includes(c.id) ? cur : [...cur, c.id]) : cur.filter((x) => x !== c.id),
  );

  const join = (id: number) =>
    startTransition(async () => {
      change({ type: "join", id });
      await joinBadminton(session.id, id);
    });
  const leave = (id: number) =>
    startTransition(async () => {
      change({ type: "leave", id });
      await leaveBadminton(session.id, id);
    });

  const onDelete = () => {
    if (!confirm(`ลบนัดตีแบด ${formatDay(session.date)} ใช่ไหม? รายชื่อที่ลงไว้จะหายด้วย`)) return;
    startDelete(async () => {
      await removeBadminton(session.id);
      close();
    });
  };

  const players = people.filter((p) => p.tags.includes("badminton"));
  const organizer = session.organizer_id !== null ? names.get(session.organizer_id) : undefined;
  const duration = formatDuration(session.start_time, session.end_time);
  const perCourt = ids.length / session.courts;

  return (
    <>
      <div className="overflow-y-auto">
        <div className="space-y-2.5 px-5 py-4">
          <InfoRow icon={<ClockIcon className="size-4" />}>
            <span className="font-semibold tabular-nums">{session.start_time}–{session.end_time}</span>
            {duration && <span className="text-slate-500"> · {duration}</span>}
          </InfoRow>
          <InfoRow icon={<MapPinIcon className="size-4" />}>
            <a href={mapsUrl(session.location)} target="_blank" rel="noreferrer" className="break-words text-sky-700 hover:underline">
              {session.location}
            </a>
          </InfoRow>
          <InfoRow icon={<CourtIcon className="size-4" />}>
            {session.courts} คอร์ด
            {ids.length >= session.courts && <span className="text-slate-500"> · เฉลี่ย {Number.isInteger(perCourt) ? perCourt : perCourt.toFixed(1)} คน/คอร์ด</span>}
          </InfoRow>
          <InfoRow icon={<PeopleIcon className="size-4" />}>
            <span className="text-slate-500">คนดูแล / จองคอร์ด: </span>
            {organizer ? (
              <span className="inline-flex items-center gap-1.5 align-middle font-medium"><Avatar name={organizer} />{organizer}</span>
            ) : (
              <span className="text-slate-400">ยังไม่ระบุ</span>
            )}
          </InfoRow>
        </div>

        <div className="border-t border-black/[0.06] px-5 py-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">คนที่ลงชื่อ <span className="font-normal text-slate-400">{ids.length} คน</span></h3>
            <button
              type="button"
              onClick={() => setAdding((a) => !a)}
              aria-expanded={adding}
              className={`${adding ? ghostBtn : primaryBtn} ml-auto px-3 py-1.5`}
            >
              {adding ? "เสร็จ" : <><PlusIcon className="size-4" />ลงชื่อ</>}
            </button>
          </div>

          {adding && (
            <div className="mt-3 rounded-2xl bg-slate-100/70 p-3">
              {players.length > 0 ? (
                <>
                  {/* Chips stay put and just toggle, so a quick second tap never lands on the wrong name. */}
                  <p className="mb-2 text-xs text-slate-500">แตะชื่อเพื่อลงชื่อ — แตะอีกครั้งเพื่อยกเลิก</p>
                  <div className="flex flex-wrap gap-1.5">
                    {players.map((p) => {
                      const on = ids.includes(p.id);
                      return <MemberChip key={p.id} member={p} selected={on} onClick={() => (on ? leave(p.id) : join(p.id))} />;
                    })}
                  </div>
                </>
              ) : (
                <NoPlayers />
              )}
            </div>
          )}

          {ids.length === 0 ? (
            !adding && <p className="mt-3 text-sm text-slate-400">ยังไม่มีใครลงชื่อ — กด “+ ลงชื่อ” ได้เลย</p>
          ) : (
            <ol className="mt-2 divide-y divide-black/[0.05]">
              {ids.map((id, i) => {
                const name = names.get(id) ?? "?";
                return (
                  <li key={id} className="flex items-center gap-3 py-2">
                    <span className="w-5 text-right text-xs text-slate-400 tabular-nums">{i + 1}</span>
                    <Avatar name={name} className="size-8 text-sm" />
                    <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                    {id === session.organizer_id && (
                      <span className="rounded-full bg-[#34c759]/12 px-2 py-0.5 text-[11px] font-medium text-[#248a3d]">คนจอง</span>
                    )}
                    <button
                      type="button"
                      onClick={() => leave(id)}
                      className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-[#ff3b30]/10 hover:text-[#ff3b30]"
                      aria-label={`เอา ${name} ออก`}
                      title="เอาออก"
                    >
                      <XMarkIcon className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      <footer className="flex items-center gap-2 border-t border-black/[0.06] px-5 py-3">
        <button type="button" onClick={onDelete} disabled={deleting} className={dangerBtn}>
          {deleting ? "กำลังลบ…" : "ลบนัด"}
        </button>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onEdit} className={ghostBtn}><PencilIcon className="size-4" />แก้ไข</button>
          <button type="button" onClick={close} className={primaryBtn}>ปิด</button>
        </div>
      </footer>
    </>
  );
}

function NoPlayers() {
  return (
    <p className="text-sm text-slate-500">
      ยังไม่มีรายชื่อที่ติดแท็ก “แบดมินตัน” — ไปติดแท็กได้ที่{" "}
      <Link href="/settings" className="font-medium text-sky-700 underline underline-offset-2">หน้าตั้งค่า</Link>{" "}
      (ต้องใช้รหัสผ่าน)
    </p>
  );
}

function SessionForm({
  session, date, taken, players, onCancel, onSaved,
}: {
  session?: BadmintonSession;
  date: string;
  taken: Map<string, BadmintonSession>;
  players: Member[];
  /** Back to the session's details; a new session just closes the dialog. */
  onCancel?: () => void;
  onSaved: (id: number, date: string) => void;
}) {
  const close = useModalClose();
  const [state, action, pending] = useActionState(saveBadminton, null);
  const [day, setDay] = useState(session?.date ?? date);
  const [courts, setCourts] = useState(session?.courts ?? 1);
  // Only ever rendered client-side (opened by a click), so reading localStorage here is safe.
  const [organizerId, setOrganizerId] = useState<number | null>(() => {
    if (session) return session.organizer_id;
    const id = Number(remembered(ORGANIZER_KEY));
    return players.some((p) => p.id === id) ? id : null;
  });
  const handled = useRef<number | undefined>(undefined);

  const clash = taken.get(day);
  const clashes = !!clash && clash.id !== session?.id;

  useEffect(() => {
    if (state?.ok && state.id && state.at !== handled.current) {
      handled.current = state.at;
      onSaved(state.id, state.date!);
    }
  }, [state, onSaved]);

  // Submit manually instead of <form action>: React resets uncontrolled fields after an action,
  // which would wipe what the user typed when validation fails.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    try {
      if (organizerId !== null) localStorage.setItem(ORGANIZER_KEY, String(organizerId));
      localStorage.setItem(PLACE_KEY, String(data.get("location") ?? ""));
    } catch {}
    startTransition(() => action(data));
  };

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
      {session && <input type="hidden" name="id" value={session.id} />}
      {organizerId !== null && <input type="hidden" name="organizer_id" value={organizerId} />}

      <div className="space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <label htmlFor="bm-date" className={labelCls}>วันที่ <span className="text-rose-500">*</span></label>
          <input id="bm-date" name="date" type="date" required value={day} onChange={(e) => setDay(e.target.value)} className={inputCls} />
          {clashes && <p className="mt-1.5 text-sm text-rose-600">วันนี้มีนัดตีแบดแล้ว ({clash.start_time}–{clash.end_time}) — 1 วันนัดได้ 1 ครั้ง</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bm-start" className={labelCls}>เวลาเริ่ม <span className="text-rose-500">*</span></label>
            <input id="bm-start" name="start_time" type="time" required defaultValue={session?.start_time ?? "18:00"} className={inputCls} />
          </div>
          <div>
            <label htmlFor="bm-end" className={labelCls}>เวลาเลิก <span className="text-rose-500">*</span></label>
            <input id="bm-end" name="end_time" type="time" required defaultValue={session?.end_time ?? "20:00"} className={inputCls} />
          </div>
        </div>

        <div>
          <label htmlFor="bm-location" className={labelCls}>สถานที่ <span className="text-rose-500">*</span></label>
          <input
            id="bm-location"
            name="location"
            required
            maxLength={LOCATION_MAX}
            defaultValue={session?.location ?? remembered(PLACE_KEY) ?? ""}
            placeholder="เช่น สนามแบด xx ลาดพร้าว"
            className={inputCls}
          />
        </div>

        <div>
          <span className={labelCls}>จำนวนคอร์ดที่จะจอง <span className="text-rose-500">*</span></span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCourts((c) => Math.max(1, c - 1))} disabled={courts <= 1} className={`${ghostBtn} size-9 p-0 text-lg`} aria-label="ลดคอร์ด">−</button>
            <input
              name="courts"
              inputMode="numeric"
              value={courts}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, ""));
                setCourts(Math.min(COURTS_MAX, Math.max(1, n || 1)));
              }}
              aria-label="จำนวนคอร์ด"
              className={`${fieldCls} w-16 text-center tabular-nums`}
            />
            <button type="button" onClick={() => setCourts((c) => Math.min(COURTS_MAX, c + 1))} disabled={courts >= COURTS_MAX} className={`${ghostBtn} size-9 p-0 text-lg`} aria-label="เพิ่มคอร์ด">+</button>
            <span className="text-sm text-slate-500">คอร์ด</span>
          </div>
        </div>

        <fieldset>
          <legend className={labelCls}>คนดูแล / จองคอร์ด <span className="text-rose-500">*</span></legend>
          {players.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 px-4 py-3"><NoPlayers /></div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {players.map((p) => (
                <MemberChip key={p.id} member={p} selected={organizerId === p.id} onClick={() => setOrganizerId(organizerId === p.id ? null : p.id)} />
              ))}
            </div>
          )}
          {!session && <p className="mt-1.5 text-xs text-slate-400">คนจองจะถูกลงชื่อให้อัตโนมัติ</p>}
        </fieldset>
      </div>

      <footer className="flex items-center gap-2 border-t border-black/[0.06] px-5 py-3">
        {state?.error && <p className="min-w-0 flex-1 text-sm text-rose-600">{state.error}</p>}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onCancel ?? close} className={ghostBtn}>ยกเลิก</button>
          <button disabled={pending || clashes} className={primaryBtn}>
            {pending ? "กำลังบันทึก…" : session ? "บันทึก" : "สร้างนัด"}
          </button>
        </div>
      </footer>
    </form>
  );
}
