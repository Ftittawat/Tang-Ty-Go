"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { removeExpense, saveExpense } from "@/app/actions";
import { dangerBtn, ghostBtn, inputCls, labelCls, MemberChip, primaryBtn } from "@/components/ui";
import {
  amountInput, EXPENSE_TITLE_MAX, formatBaht, parseAmount, splitAmount, type Expense,
} from "@/lib/expenses";
import type { Member } from "@/lib/trips";

const PAYER_KEY = "tg_payer_id";

function rememberedPayer(choices: Member[]) {
  try {
    const id = Number(localStorage.getItem(PAYER_KEY));
    return choices.some((m) => m.id === id) ? id : null;
  } catch {
    return null;
  }
}

export function ExpenseDialog({
  tripId, expense, choices, pool, onClose, onAgain,
}: {
  tripId: number;
  expense: Expense | null;
  /** People shown as chips: the trip's people plus anyone already on this expense. */
  choices: Member[];
  /** Who "หารเท่าทุกคน" means. */
  pool: number[];
  onClose: () => void;
  /** Saved with "บันทึก + เพิ่มต่อ": parent opens a fresh dialog. */
  onAgain: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const again = useRef(false);
  const [state, action, pending] = useActionState(saveExpense, null);
  const [deleting, startDelete] = useTransition();
  // Only ever rendered client-side (opened by a click), so reading localStorage here is safe.
  const [payerId, setPayerId] = useState<number | null>(() => (expense ? expense.payer_id : rememberedPayer(choices)));
  const [splitAll, setSplitAll] = useState(expense?.split_all ?? true);
  const [sharers, setSharers] = useState<number[]>(() => (expense && !expense.split_all ? expense.share_ids : pool));
  const [amountText, setAmountText] = useState(expense ? amountInput(expense.amount) : "");

  const toggle = (id: number) => setSharers((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allTicked = choices.every((m) => sharers.includes(m.id));

  const amount = parseAmount(amountText);
  const splitIds = splitAll ? pool : sharers;
  const parts = amount ? [...splitAmount(amount, splitIds).values()] : [];
  const each = parts.length ? Math.max(...parts) : null;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    if (!state?.ok) return;
    if (again.current) onAgain();
    else onClose();
  }, [state, onClose, onAgain]);

  // Submit manually instead of <form action>: React resets uncontrolled fields after an action,
  // which would wipe what the user typed when validation fails.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    again.current = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("name") === "again";
    const data = new FormData(e.currentTarget);
    try {
      if (payerId !== null) localStorage.setItem(PAYER_KEY, String(payerId));
    } catch {}
    startTransition(() => action(data));
  };

  const onDelete = () => {
    if (!expense || !confirm(`ลบรายการ “${expense.title}” ใช่ไหม?`)) return;
    startDelete(async () => {
      await removeExpense(expense.id);
      onClose();
    });
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-transparent"
    >
      <form onSubmit={onSubmit} className="flex max-h-[90dvh] flex-col">
        <input type="hidden" name="trip_id" value={tripId} />
        {expense && <input type="hidden" name="id" value={expense.id} />}
        {payerId !== null && <input type="hidden" name="payer_id" value={payerId} />}
        <input type="hidden" name="split_all" value={splitAll ? "1" : "0"} />
        {!splitAll && sharers.map((id) => <input key={id} type="hidden" name="share_ids" value={id} />)}

        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="font-semibold">{expense ? "แก้ไขรายการ" : "เพิ่มรายการค่าใช้จ่าย"}</h2>
          <button type="button" onClick={() => ref.current?.close()} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="ปิด">
            ✕
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <div>
              <label htmlFor="title" className={labelCls}>
                รายการ <span className="text-rose-500">*</span>
              </label>
              <input id="title" name="title" required maxLength={EXPENSE_TITLE_MAX} defaultValue={expense?.title} autoFocus placeholder="เช่น ค่าที่พัก, ข้าวเที่ยงวันที่ 2" className={inputCls} />
            </div>
            <div>
              <label htmlFor="amount" className={labelCls}>
                จำนวนเงิน (บาท) <span className="text-rose-500">*</span>
              </label>
              <input
                id="amount"
                name="amount"
                required
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="0"
                className={`${inputCls} text-right tabular-nums`}
              />
            </div>
          </div>

          {choices.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
              ยังไม่มีรายชื่อแก๊ง — เพิ่มรายชื่อในหน้าตั้งค่าก่อนนะ
            </p>
          ) : (
            <>
              <fieldset>
                <legend className={labelCls}>
                  ใครจ่าย <span className="text-rose-500">*</span>
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {choices.map((m) => (
                    <MemberChip key={m.id} member={m} selected={payerId === m.id} onClick={() => setPayerId(payerId === m.id ? null : m.id)} />
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className={labelCls}>หารกับใคร</legend>
                <div className="mb-2 grid grid-cols-2 gap-1.5">
                  {[
                    { all: true, label: `หารเท่าทุกคน (${pool.length})` },
                    { all: false, label: "เลือกคนหาร" },
                  ].map((o) => (
                    <button
                      key={String(o.all)}
                      type="button"
                      onClick={() => setSplitAll(o.all)}
                      aria-pressed={splitAll === o.all}
                      className={`rounded-lg border px-2 py-1.5 text-sm font-medium transition ${
                        splitAll === o.all ? "border-transparent bg-sky-50 text-sky-800 ring-2 ring-sky-400" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                {splitAll ? (
                  <p className="text-xs text-slate-500">
                    หารกับทุกคนในทริป — ถ้าเพิ่ม/ลดคนในการ์ดทริปทีหลัง ยอดจะคำนวณใหม่ให้อัตโนมัติ
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {choices.map((m) => (
                        <MemberChip key={m.id} member={m} selected={sharers.includes(m.id)} onClick={() => toggle(m.id)} />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSharers(allTicked ? [] : choices.map((m) => m.id))}
                      className="mt-1.5 rounded px-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
                    >
                      {allTicked ? "ล้าง" : "เลือกทุกคน"}
                    </button>
                  </>
                )}
              </fieldset>
            </>
          )}

          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {each !== null && Number.isFinite(each) ? (
              <>
                หาร <b>{splitIds.length}</b> คน · คนละ <b className="tabular-nums">฿{formatBaht(each)}</b>
                {parts.some((p) => p !== each) && <span className="text-slate-400"> (เศษสตางค์ปัดให้บางคน)</span>}
              </>
            ) : (
              <span className="text-slate-400">ใส่จำนวนเงินและเลือกคนหาร เพื่อดูว่าตกคนละเท่าไหร่</span>
            )}
          </p>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
          {expense && (
            <button type="button" onClick={onDelete} disabled={deleting || pending} className={dangerBtn}>
              {deleting ? "กำลังลบ…" : "ลบ"}
            </button>
          )}
          {state?.error && <p className="min-w-0 flex-1 text-sm text-rose-600">{state.error}</p>}
          <div className="ml-auto flex gap-2">
            {expense ? (
              <button type="button" onClick={() => ref.current?.close()} className={ghostBtn}>ยกเลิก</button>
            ) : (
              <button name="again" disabled={pending} className={ghostBtn}>บันทึก + เพิ่มต่อ</button>
            )}
            <button disabled={pending || deleting} className={primaryBtn}>
              {pending ? "กำลังบันทึก…" : expense ? "บันทึก" : "เพิ่มรายการ"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
