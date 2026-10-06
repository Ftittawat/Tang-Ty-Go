"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { removeTrip, saveTrip } from "@/app/actions";
import { dangerBtn, ghostBtn, inputCls, labelCls, primaryBtn } from "@/components/ui";
import { be, CATEGORIES, MONTHS_TH_FULL, STATUSES, type Status, type Trip } from "@/lib/trips";

const OWNER_KEY = "tg_owner";

function rememberedOwner() {
  try {
    return localStorage.getItem(OWNER_KEY) ?? "";
  } catch {
    return "";
  }
}

export function TripDialog({
  trip, defaultStatus, owners, onClose,
}: {
  trip: Trip | null;
  defaultStatus: Status;
  owners: string[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(saveTrip, null);
  const [deleting, startDelete] = useTransition();
  const [status, setStatus] = useState<Status>(trip?.status ?? defaultStatus);
  const [start, setStart] = useState(trip?.start_date ?? "");
  // Only ever rendered client-side (opened by a click), so reading localStorage here is safe.
  const [owner, setOwner] = useState(() => trip?.owner ?? rememberedOwner());

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const thisYear = new Date().getFullYear();
  const years = new Set<number>();
  for (let y = thisYear - 2; y <= thisYear + 5; y++) years.add(y);
  if (trip?.target_year) years.add(trip.target_year);

  // Submit manually instead of <form action>: React resets uncontrolled fields after an action,
  // which would wipe what the user typed when validation fails.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    try {
      if (owner.trim()) localStorage.setItem(OWNER_KEY, owner.trim());
    } catch {}
    startTransition(() => action(data));
  };

  const onDelete = () => {
    if (!trip || !confirm(`ลบ “${trip.title}” ใช่ไหม? กู้คืนไม่ได้นะ`)) return;
    startDelete(async () => {
      await removeTrip(trip.id);
      onClose();
    });
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-transparent"
    >
      <form onSubmit={onSubmit} className="flex max-h-[90dvh] flex-col">
        {trip && <input type="hidden" name="id" value={trip.id} />}
        <input type="hidden" name="status" value={status} />

        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="font-semibold">{trip ? "แก้ไขทริป" : "เพิ่มทริป / กิจกรรมใหม่"}</h2>
          <button type="button" onClick={() => ref.current?.close()} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="ปิด">
            ✕
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label htmlFor="title" className={labelCls}>
              ชื่อทริป / กิจกรรม <span className="text-rose-500">*</span>
            </label>
            <input id="title" name="title" required maxLength={120} defaultValue={trip?.title} autoFocus placeholder="เช่น เขาใหญ่ แคมป์ปิ้งปีใหม่" className={inputCls} />
          </div>

          <fieldset>
            <legend className={labelCls}>สถานะ</legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {STATUSES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.id)}
                  aria-pressed={status === s.id}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                    status === s.id ? `border-transparent ${s.tint} ring-2 ${s.ring}` : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <span className={`size-2 rounded-full ${s.dot}`} />
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className={labelCls}>ประเภท</label>
              <select id="category" name="category" defaultValue={trip?.category ?? "trip"} className={inputCls}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="location" className={labelCls}>สถานที่</label>
              <input id="location" name="location" maxLength={200} defaultValue={trip?.location ?? ""} placeholder="เช่น อช.เขาใหญ่, นครราชสีมา" className={inputCls} />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs font-medium text-slate-600">🗓️ วันที่ไป <span className="font-normal text-slate-400">(ถ้ารู้แล้ว)</span></p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="start_date" className={labelCls}>เริ่ม</label>
                <input id="start_date" name="start_date" type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label htmlFor="end_date" className={labelCls}>ถึง</label>
                <input id="end_date" name="end_date" type="date" min={start || undefined} defaultValue={trip?.end_date ?? ""} className={inputCls} />
              </div>
            </div>
            <p className="mb-2 mt-3 text-xs font-medium text-slate-600">🎯 เป้าหมายคร่าวๆ <span className="font-normal text-slate-400">(ถ้ายังไม่ล็อกวัน)</span></p>
            <div className="grid grid-cols-2 gap-3">
              <select name="target_month" aria-label="เดือนเป้าหมาย" defaultValue={trip?.target_month ?? ""} className={inputCls}>
                <option value="">— เดือน —</option>
                {MONTHS_TH_FULL.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select name="target_year" aria-label="ปีเป้าหมาย" defaultValue={trip?.target_year ?? ""} className={inputCls}>
                <option value="">— ปี —</option>
                {[...years].sort().map((y) => (
                  <option key={y} value={y}>{be(y)} ({y})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="owner" className={labelCls}>เจ้าของทริป (Owner)</label>
              <input id="owner" name="owner" list="owner-list" maxLength={60} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="ใครเป็นคนดูแล" className={inputCls} />
              <datalist id="owner-list">
                {owners.map((o) => <option key={o} value={o} />)}
              </datalist>
            </div>
            <div>
              <label htmlFor="budget" className={labelCls}>งบประมาณ (บาท/คน)</label>
              <input id="budget" name="budget" inputMode="numeric" defaultValue={trip?.budget ?? ""} placeholder="เช่น 3500" className={inputCls} />
            </div>
          </div>

          <div>
            <label htmlFor="participants" className={labelCls}>ใครไปบ้าง <span className="font-normal text-slate-400">(คั่นด้วย ,)</span></label>
            <input id="participants" name="participants" maxLength={500} defaultValue={trip?.participants ?? ""} placeholder="เช่น ต้น, ตี๋, แบม" className={inputCls} />
          </div>

          <div>
            <label htmlFor="link" className={labelCls}>ลิงก์อ้างอิง</label>
            <input id="link" name="link" type="text" inputMode="url" maxLength={1000} defaultValue={trip?.link ?? ""} placeholder="ที่พัก, รีวิว, Google Maps…" className={inputCls} />
          </div>

          <div>
            <label htmlFor="description" className={labelCls}>รายละเอียด / โน้ต</label>
            <textarea id="description" name="description" rows={4} maxLength={5000} defaultValue={trip?.description ?? ""} placeholder="แผนคร่าวๆ สิ่งที่ต้องเตรียม ของที่ต้องจอง…" className={inputCls} />
          </div>
        </div>

        <footer className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
          {trip && (
            <button type="button" onClick={onDelete} disabled={deleting || pending} className={dangerBtn}>
              {deleting ? "กำลังลบ…" : "ลบ"}
            </button>
          )}
          {state?.error && <p className="min-w-0 flex-1 text-sm text-rose-600">{state.error}</p>}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => ref.current?.close()} className={ghostBtn}>ยกเลิก</button>
            <button disabled={pending || deleting} className={primaryBtn}>
              {pending ? "กำลังบันทึก…" : trip ? "บันทึก" : "เพิ่มทริป"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
