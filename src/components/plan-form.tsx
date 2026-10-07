"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { createPlan, updatePlan, type PlanFormState } from "@/app/plan-actions";
import { useModalClose } from "@/components/modal";
import { ghostBtn, inputCls, labelCls, primaryBtn } from "@/components/ui";
import { MAX_DAYS, type Plan } from "@/lib/plans";
import { categoryOf, formatDateRange, tripNights, type Trip } from "@/lib/trips";

/** Create / edit form for a plan; meant to sit inside <Modal>. */
export function PlanForm({
  plan, trips, defaultTripId, footerStart,
}: {
  plan?: Plan;
  trips: Trip[];
  defaultTripId?: number;
  footerStart?: React.ReactNode;
}) {
  const close = useModalClose();
  const [state, action, pending] = useActionState<PlanFormState, FormData>(plan ? updatePlan : createPlan, null);
  const initialTrip = trips.find((t) => t.id === (plan ? plan.trip_id : defaultTripId));
  const [tripId, setTripId] = useState(initialTrip ? String(initialTrip.id) : "");
  const [title, setTitle] = useState(plan?.title ?? initialTrip?.title ?? "");
  const [startDate, setStartDate] = useState(plan?.start_date ?? initialTrip?.start_date ?? "");
  const [dayCount, setDayCount] = useState(
    String(plan?.day_count ?? tripNights(initialTrip?.start_date ?? null, initialTrip?.end_date ?? null) ?? 1),
  );

  // Create redirects to the new plan; edit just closes.
  useEffect(() => {
    if (state?.ok) close();
  }, [state, close]);

  // Picking a trip fills in what we already know about it (but keeps a custom title).
  const pickTrip = (id: string) => {
    const prev = trips.find((t) => String(t.id) === tripId);
    const next = trips.find((t) => String(t.id) === id);
    setTripId(id);
    if (!next) return;
    if (!title.trim() || title === prev?.title) setTitle(next.title);
    if (next.start_date) {
      setStartDate(next.start_date);
      setDayCount(String(Math.min(tripNights(next.start_date, next.end_date) ?? 1, MAX_DAYS)));
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <div className="space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <label htmlFor="plan-trip" className={labelCls}>ลิงก์กับทริป</label>
          <select id="plan-trip" name="trip_id" value={tripId} onChange={(e) => pickTrip(e.target.value)} className={inputCls}>
            <option value="">— ไม่ลิงก์กับทริป —</option>
            {trips.map((t) => {
              const dates = formatDateRange(t.start_date, t.end_date);
              return (
                <option key={t.id} value={t.id}>
                  {categoryOf(t.category).emoji} {t.title}{dates ? ` · ${dates}` : ""}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label htmlFor="plan-title" className={labelCls}>
            ชื่อแผน <span className="text-rose-500">*</span>
          </label>
          <input
            id="plan-title"
            name="title"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น เขาใหญ่ 3 วัน 2 คืน"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="plan-start" className={labelCls}>วันแรก <span className="font-normal text-slate-400">(ไม่บังคับ)</span></label>
            <input id="plan-start" name="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="plan-days" className={labelCls}>จำนวนวัน</label>
            <input
              id="plan-days"
              name="day_count"
              type="number"
              min={1}
              max={MAX_DAYS}
              required
              value={dayCount}
              onChange={(e) => setDayCount(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label htmlFor="plan-note" className={labelCls}>โน้ตของแผน</label>
          <textarea
            id="plan-note"
            name="note"
            rows={3}
            maxLength={5000}
            defaultValue={plan?.note ?? ""}
            placeholder="ของที่ต้องเตรียม, เบอร์ที่พัก, จุดนัดพบ…"
            className={inputCls}
          />
        </div>
      </div>

      <footer className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
        {footerStart}
        {state?.error && <p className="min-w-0 flex-1 text-sm text-rose-600">{state.error}</p>}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={close} className={ghostBtn}>ยกเลิก</button>
          <button disabled={pending} className={primaryBtn}>
            {pending ? "กำลังบันทึก…" : plan ? "บันทึก" : "สร้างแผน"}
          </button>
        </div>
      </footer>
    </form>
  );
}
