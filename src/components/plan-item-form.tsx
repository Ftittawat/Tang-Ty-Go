"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { saveItem } from "@/app/plan-actions";
import { useModalClose } from "@/components/modal";
import { ghostBtn, inputCls, labelCls, primaryBtn } from "@/components/ui";
import {
  dayDateLabel, formatDuration, formatTime, parseTime, TRAVEL_MODES,
  type PlanItem, type PlanItemKind, type TravelMode,
} from "@/lib/plans";

export type ItemDraft = {
  item?: PlanItem;
  kind: PlanItemKind;
  day: number;
  beforeId?: number; // insert before this item (e.g. travel between two activities)
  autoStart: number | null; // when the item would start if chained from the previous one
};

const splitDuration = (min: number | null) =>
  min === null ? { h: "", m: "" } : { h: String(Math.floor(min / 60)), m: String(min % 60) };

/** Activity / travel editor; meant to sit inside <Modal>. */
export function PlanItemForm({
  planId, dayCount, startDate, draft,
}: {
  planId: number;
  dayCount: number;
  startDate: string | null;
  draft: ItemDraft;
}) {
  const close = useModalClose();
  const { item, kind, autoStart } = draft;
  const [state, action, pending] = useActionState(saveItem, null);

  const initialDur = item?.duration_min ?? null;
  const initialStart = parseTime(item?.start_time) ?? autoStart;
  const [start, setStart] = useState(item?.start_time ?? "");
  const [dur, setDur] = useState(splitDuration(initialDur));
  const [end, setEnd] = useState(initialStart !== null && initialDur !== null ? formatTime(initialStart + initialDur) : "");
  const [mode, setMode] = useState<TravelMode>(item?.travel_mode ?? "car");

  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);

  const durMin = dur.h === "" && dur.m === "" ? null : (Number(dur.h) || 0) * 60 + (Number(dur.m) || 0);
  const effStart = parseTime(start) ?? autoStart;

  // Start, end and duration describe the same span: editing one recomputes the others.
  const onStart = (v: string) => {
    setStart(v);
    const s = parseTime(v) ?? autoStart;
    if (s === null) return;
    if (durMin !== null) setEnd(formatTime(s + durMin));
    else if (parseTime(end) !== null) setDur(splitDuration(diff(s, parseTime(end)!)));
  };
  const onEnd = (v: string) => {
    setEnd(v);
    const e = parseTime(v);
    if (effStart !== null && e !== null) setDur(splitDuration(diff(effStart, e)));
  };
  const onDur = (next: { h: string; m: string }) => {
    setDur(next);
    const total = next.h === "" && next.m === "" ? null : (Number(next.h) || 0) * 60 + (Number(next.m) || 0);
    if (effStart !== null && total !== null) setEnd(formatTime(effStart + total));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };

  const isTravel = kind === "travel";

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
      <input type="hidden" name="plan_id" value={planId} />
      <input type="hidden" name="kind" value={kind} />
      {item && <input type="hidden" name="id" value={item.id} />}
      {draft.beforeId && <input type="hidden" name="before_id" value={draft.beforeId} />}
      <input type="hidden" name="duration_min" value={durMin ?? ""} />
      {isTravel && <input type="hidden" name="travel_mode" value={mode} />}
      {(isTravel || dayCount === 1) && <input type="hidden" name="day" value={draft.day} />}

      <div className="space-y-4 overflow-y-auto px-5 py-4">
        {isTravel ? (
          <fieldset>
            <legend className={labelCls}>เดินทางด้วย</legend>
            <div className="flex flex-wrap gap-1.5">
              {TRAVEL_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    mode === m.id
                      ? "border-sky-500 bg-sky-50 font-medium text-sky-800 ring-1 ring-sky-500"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </fieldset>
        ) : (
          <div>
            <label htmlFor="item-title" className={labelCls}>
              ชื่อกิจกรรม <span className="text-rose-500">*</span>
            </label>
            <input id="item-title" name="title" required maxLength={120} defaultValue={item?.title ?? ""} autoFocus placeholder="เช่น เช็คอินที่พัก, ดูพระอาทิตย์ตก" className={inputCls} />
          </div>
        )}

        {!isTravel && dayCount > 1 && (
          <div>
            <label htmlFor="item-day" className={labelCls}>วัน</label>
            <select id="item-day" name="day" defaultValue={draft.day} className={inputCls}>
              {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  วันที่ {d}{dayDateLabel(startDate, d) ? ` · ${dayDateLabel(startDate, d)}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="rounded-xl bg-slate-50 p-3">
          <div className={`grid gap-3 ${isTravel ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-[1fr_1fr_1.3fr]"}`}>
            {!isTravel && (
              <>
                <div>
                  <label htmlFor="item-start" className={labelCls}>เวลาเริ่ม</label>
                  <input id="item-start" name="start_time" type="time" value={start} onChange={(e) => onStart(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="item-end" className={labelCls}>เวลาสิ้นสุด</label>
                  <input
                    id="item-end"
                    type="time"
                    value={end}
                    onChange={(e) => onEnd(e.target.value)}
                    disabled={effStart === null}
                    title={effStart === null ? "ใส่เวลาเริ่มก่อน" : undefined}
                    className={inputCls}
                  />
                </div>
              </>
            )}
            <div className={isTravel ? "" : "col-span-2 sm:col-span-1"}>
              <span className={labelCls}>
                {isTravel ? "ใช้เวลาเดินทาง" : "ใช้เวลา"} {isTravel && <span className="text-rose-500">*</span>}
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={72}
                  inputMode="numeric"
                  aria-label="ชั่วโมง"
                  value={dur.h}
                  onChange={(e) => onDur({ ...dur, h: e.target.value })}
                  placeholder="0"
                  className={`${inputCls} min-w-0 text-right`}
                />
                <span className="text-xs text-slate-500">ชม.</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  inputMode="numeric"
                  aria-label="นาที"
                  value={dur.m}
                  onChange={(e) => onDur({ ...dur, m: e.target.value })}
                  placeholder="0"
                  className={`${inputCls} min-w-0 text-right`}
                />
                <span className="text-xs text-slate-500">นาที</span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {isTravel
              ? autoStart !== null && durMin
                ? `ออก ${formatTime(autoStart)} → ถึง ${formatTime(autoStart + durMin)}`
                : "เวลาออกต่อจากรายการก่อนหน้าอัตโนมัติ"
              : start
                ? `เวลาคงที่ — ${formatDuration(durMin) ?? "ยังไม่ใส่ระยะเวลา"}`
                : autoStart !== null
                  ? `เว้นเวลาเริ่มว่าง = เริ่มต่อจากรายการก่อนหน้า (~${formatTime(autoStart)})`
                  : "รายการแรกของวัน — ใส่เวลาเริ่มเพื่อให้รายการถัดไปคำนวณเวลาต่อได้"}
          </p>
        </div>

        {isTravel ? (
          <div>
            <label htmlFor="item-title" className={labelCls}>เส้นทาง <span className="font-normal text-slate-400">(ไม่บังคับ)</span></label>
            <input id="item-title" name="title" maxLength={120} defaultValue={item?.title ?? ""} placeholder="เช่น ที่พัก → ตลาดน้ำ" className={inputCls} />
          </div>
        ) : (
          <div>
            <label htmlFor="item-location" className={labelCls}>สถานที่</label>
            <input id="item-location" name="location" maxLength={200} defaultValue={item?.location ?? ""} placeholder="ชื่อสถานที่ (กดเปิดใน Google Maps ได้)" className={inputCls} />
          </div>
        )}

        <div>
          <label htmlFor="item-details" className={labelCls}>รายละเอียดเพิ่มเติม</label>
          <textarea
            id="item-details"
            name="details"
            rows={3}
            maxLength={5000}
            defaultValue={item?.details ?? ""}
            placeholder={isTravel ? "ค่าใช้จ่าย, เบอร์รถ, จุดขึ้นรถ…" : "ค่าเข้า, ต้องจองล่วงหน้า, ของที่ต้องเตรียม…"}
            className={inputCls}
          />
        </div>
      </div>

      <footer className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
        {state?.error && <p className="min-w-0 flex-1 text-sm text-rose-600">{state.error}</p>}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={close} className={ghostBtn}>ยกเลิก</button>
          <button disabled={pending} className={primaryBtn}>{pending ? "กำลังบันทึก…" : item ? "บันทึก" : "เพิ่ม"}</button>
        </div>
      </footer>
    </form>
  );
}

/** Minutes from a to b, wrapping past midnight. */
function diff(a: number, b: number) {
  const d = b - a;
  return d < 0 ? d + 1440 : d;
}
