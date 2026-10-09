"use client";

import Link from "next/link";
import { startTransition, useCallback, useMemo, useOptimistic, useState } from "react";
import { setExpenseShares, setSettled } from "@/app/actions";
import { AppHeader } from "@/components/app-nav";
import { ExpenseDialog } from "@/components/expense-dialog";
import { Avatar, ghostBtn, pageCls, primaryBtn } from "@/components/ui";
import { formatBaht, settle, sharersOf, splitAmount, type Balance, type Expense } from "@/lib/expenses";
import { categoryOf, formatDateRange, type Member, type Trip } from "@/lib/trips";

type DialogState = { expense: Expense | null; n: number } | null;

function Net({ net }: { net: number }) {
  if (net > 0) return <span className="font-semibold text-emerald-700">ได้คืน ฿{formatBaht(net)}</span>;
  if (net < 0) return <span className="font-semibold text-rose-600">ต้องจ่าย ฿{formatBaht(-net)}</span>;
  return <span className="text-slate-400">ลงตัวแล้ว</span>;
}

export function ExpensesBoard({
  trip, members, expenses, settled,
}: {
  trip: Trip;
  members: Member[];
  expenses: Expense[];
  settled: number[];
}) {
  const [rows, applyShares] = useOptimistic(expenses, (cur, u: { id: number; share_ids: number[] }) =>
    cur.map((e) => (e.id === u.id ? { ...e, split_all: false, share_ids: u.share_ids } : e)),
  );
  const [done, applySettled] = useOptimistic(settled, (cur, u: { id: number; on: boolean }) =>
    u.on ? [...cur, u.id] : cur.filter((x) => x !== u.id),
  );
  const [dialog, setDialog] = useState<DialogState>(null);
  const [copied, setCopied] = useState(false);

  const names = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);
  const nameOf = (id: number | null) => (id === null ? undefined : names.get(id));

  // "หารเท่าทุกคน" = the trip's people; a trip with nobody picked yet falls back to the whole gang.
  const pool = useMemo(() => {
    const goers = trip.participant_ids.filter((id) => names.has(id));
    return goers.length ? goers : members.map((m) => m.id);
  }, [trip.participant_ids, members, names]);

  // Columns: the pool plus anyone who paid or was ticked on some row (e.g. later removed from the trip).
  const columns = useMemo(() => {
    const ids = new Set(pool);
    for (const e of rows) {
      if (e.payer_id !== null) ids.add(e.payer_id);
      for (const id of e.share_ids) ids.add(id);
    }
    return [...ids].filter((id) => names.has(id)).sort((a, b) => names.get(a)!.localeCompare(names.get(b)!, "th"));
  }, [pool, rows, names]);

  const result = useMemo(() => settle(rows, pool), [rows, pool]);
  const balanceOf = useMemo(() => new Map(result.balances.map((b) => [b.member_id, b])), [result]);
  const balances = columns.map((id) => balanceOf.get(id)).filter((b): b is Balance => !!b);

  const toggleShare = (e: Expense, memberId: number) => {
    const cur = sharersOf(e, pool);
    const next = cur.includes(memberId) ? cur.filter((x) => x !== memberId) : [...cur, memberId];
    if (next.length === 0) return alert("ต้องมีคนหารอย่างน้อย 1 คน — ถ้าไม่ใช้รายการนี้แล้ว ให้กดที่ชื่อรายการแล้วลบ");
    startTransition(async () => {
      applyShares({ id: e.id, share_ids: next });
      await setExpenseShares(e.id, next);
    });
  };

  const toggleSettled = (memberId: number) => {
    const on = !done.includes(memberId);
    startTransition(async () => {
      applySettled({ id: memberId, on });
      await setSettled(trip.id, memberId, on);
    });
  };

  const copySummary = async () => {
    const lines = [
      `💸 ${trip.title} — รวม ฿${formatBaht(result.total)}`,
      "",
      ...balances.map((b) => `${nameOf(b.member_id)}: จ่ายไป ฿${formatBaht(b.paid)} / ส่วนของตัวเอง ฿${formatBaht(b.owed)}`),
      "",
      "ใครโอนให้ใคร",
      ...(result.transfers.length
        ? result.transfers.map((t) => `• ${nameOf(t.from)} → ${nameOf(t.to)} ฿${formatBaht(t.amount)}`)
        : ["• ไม่ต้องโอน ลงตัวแล้ว 🎉"]),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("คัดลอกไม่ได้ — เบราว์เซอร์ไม่อนุญาต");
    }
  };

  const closeDialog = useCallback(() => setDialog(null), []);
  const addAnother = useCallback(() => setDialog((d) => ({ expense: null, n: (d?.n ?? 0) + 1 })), []);

  const dialogChoices = (e: Expense | null) => {
    const ids = new Set(pool);
    if (e?.payer_id != null) ids.add(e.payer_id);
    for (const id of e?.share_ids ?? []) ids.add(id);
    return members.filter((m) => ids.has(m.id));
  };

  const cat = categoryOf(trip.category);
  const dates = formatDateRange(trip.start_date, trip.end_date);
  const settledCount = balances.filter((b) => b.net !== 0 && done.includes(b.member_id)).length;
  const toSettle = balances.filter((b) => b.net !== 0).length;

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className={`${pageCls} space-y-5 py-5`}>
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">← บอร์ด</Link>
          <div className="mt-2 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold leading-snug break-words">
                <span aria-hidden>{cat.emoji}</span> {trip.title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">💸 ค่าใช้จ่าย / หารบิล{dates && ` · ${dates}`}</p>
            </div>
            <button onClick={() => setDialog({ expense: null, n: 0 })} aria-label="เพิ่มรายการ" className={`${primaryBtn} shrink-0`}>
              <span className="text-base leading-none">+</span> <span className="hidden sm:inline">เพิ่ม</span>รายการ
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-teal-600 p-3 text-white sm:p-4 shadow-sm">
            <p className="text-xs text-sky-100">ยอดรวม</p>
            <p className="mt-1 text-lg font-bold tabular-nums sm:text-2xl">฿{formatBaht(result.total)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-xs text-slate-500">รายการ</p>
            <p className="mt-1 text-lg font-bold tabular-nums sm:text-2xl">{rows.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-xs text-slate-500">เคลียร์แล้ว</p>
            <p className="mt-1 text-lg font-bold tabular-nums sm:text-2xl">
              {settledCount}<span className="text-sm font-medium text-slate-400">/{toSettle} คน</span>
            </p>
          </div>
        </div>

        {result.unsplit.length > 0 && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ มี {result.unsplit.length} รายการที่ไม่มีคนจ่ายหรือไม่มีคนหาร (เช่น ลบชื่อออกจากแก๊งไปแล้ว) — ยังไม่นับในสรุป กดที่ชื่อรายการเพื่อแก้
          </p>
        )}

        {rows.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <h2 className="px-5 pt-4 font-semibold">สรุปยอดแต่ละคน</h2>
              <p className="px-5 text-sm text-slate-500">ติ๊ก “เคลียร์แล้ว” เมื่อโอนเงินกันเรียบร้อย</p>
              <div className="overflow-x-auto px-2 pb-2">
                <table className="mt-2 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="px-3 py-2 font-medium">ชื่อ</th>
                      <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">จ่ายไป</th>
                      <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">ส่วนของตัวเอง</th>
                      <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">สุทธิ</th>
                      <th className="px-3 py-2 text-center font-medium">เคลียร์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {balances.map((b) => {
                      const isDone = done.includes(b.member_id);
                      return (
                        <tr key={b.member_id} className={isDone ? "opacity-50" : ""}>
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-2 whitespace-nowrap font-medium">
                              <Avatar name={nameOf(b.member_id)!} />
                              {nameOf(b.member_id)}
                              <span className="ml-auto text-sm tabular-nums sm:hidden"><Net net={b.net} /></span>
                            </span>
                            <span className="mt-0.5 block whitespace-nowrap pl-8 text-xs text-slate-500 tabular-nums sm:hidden">
                              จ่ายไป ฿{formatBaht(b.paid)} · ส่วนตัว ฿{formatBaht(b.owed)}
                            </span>
                          </td>
                          <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{b.paid ? `฿${formatBaht(b.paid)}` : "–"}</td>
                          <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">{b.owed ? `฿${formatBaht(b.owed)}` : "–"}</td>
                          <td className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums sm:table-cell"><Net net={b.net} /></td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => toggleSettled(b.member_id)}
                              aria-label={`${nameOf(b.member_id)} เคลียร์แล้ว`}
                              className="size-4 accent-emerald-600"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="min-w-0 self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">ใครโอนให้ใคร</h2>
                <button onClick={copySummary} className={`${ghostBtn} ml-auto px-2.5 py-1 text-xs`}>
                  {copied ? "คัดลอกแล้ว ✓" : "คัดลอกสรุป"}
                </button>
              </div>
              <p className="mb-3 text-sm text-slate-500">โอนน้อยครั้งที่สุดให้ทุกคนลงตัว</p>
              {result.transfers.length === 0 ? (
                <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">ไม่ต้องโอน ลงตัวแล้ว 🎉</p>
              ) : (
                <ul className="space-y-2">
                  {result.transfers.map((t) => {
                    const isDone = done.includes(t.from);
                    return (
                      <li
                        key={`${t.from}-${t.to}`}
                        className={`flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm ${isDone ? "opacity-50" : ""}`}
                      >
                        <Avatar name={nameOf(t.from)!} />
                        <span className={`font-medium ${isDone ? "line-through" : ""}`}>{nameOf(t.from)}</span>
                        <span className="text-slate-400" aria-label="โอนให้">→</span>
                        <Avatar name={nameOf(t.to)!} />
                        <span className="min-w-0 truncate font-medium">{nameOf(t.to)}</span>
                        <span className="ml-auto whitespace-nowrap font-semibold tabular-nums">฿{formatBaht(t.amount)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 px-5 pt-4">
            <h2 className="font-semibold">รายการค่าใช้จ่าย</h2>
            <span className="text-sm text-slate-400">({rows.length})</span>
          </div>
          <p className="px-5 text-sm text-slate-500">ติ๊กช่องชื่อเพื่อเลือกว่าใครหารรายการไหน · กดชื่อรายการเพื่อแก้ไข</p>

          {rows.length === 0 ? (
            <div className="m-5 rounded-xl border-2 border-dashed border-slate-200 px-4 py-10 text-center">
              <p className="text-sm text-slate-400">ยังไม่มีรายการ — จดบิลแรกเลย เช่น ค่าที่พัก ค่าน้ำมัน</p>
              <button onClick={() => setDialog({ expense: null, n: 0 })} className={`${primaryBtn} mt-3`}>
                + เพิ่มรายการแรก
              </button>
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto border-t border-slate-100">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th className="sticky left-0 z-10 min-w-40 border-b border-slate-200 bg-white px-4 py-2 text-left font-medium sm:min-w-56">รายการ</th>
                    <th className="border-b border-slate-200 px-3 py-2 text-right font-medium">จำนวน</th>
                    {columns.map((id) => (
                      <th key={id} className="border-b border-slate-200 px-1 py-2 font-medium">
                        <span className="flex flex-col items-center gap-0.5">
                          <Avatar name={nameOf(id)!} />
                          <span className="max-w-16 truncate">{nameOf(id)}</span>
                        </span>
                      </th>
                    ))}
                    <th className="border-b border-slate-200 px-3 py-2 text-right font-medium">หาร</th>
                    <th className="border-b border-slate-200 px-4 py-2 text-right font-medium">คนละ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => {
                    const parts = splitAmount(e.amount, sharersOf(e, pool));
                    const each = parts.size ? Math.max(...parts.values()) : null;
                    const payer = nameOf(e.payer_id);
                    return (
                      <tr key={e.id} className="group">
                        <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-2 group-hover:bg-slate-50">
                          <button onClick={() => setDialog({ expense: e, n: 0 })} className="block w-full text-left">
                            <span className="block font-medium hover:text-sky-700 hover:underline">{e.title}</span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              {payer ? <>จ่ายโดย <span className="font-medium text-slate-700">{payer}</span></> : <span className="text-amber-700">ยังไม่ระบุคนจ่าย</span>}
                              {e.split_all && <span className="rounded bg-sky-50 px-1 text-[10px] font-medium text-sky-700">หารทุกคน</span>}
                            </span>
                          </button>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 text-right font-medium tabular-nums group-hover:bg-slate-50">
                          {formatBaht(e.amount)}
                        </td>
                        {columns.map((id) => (
                          <td key={id} className="border-b border-slate-100 px-1 py-2 text-center group-hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={parts.has(id)}
                              onChange={() => toggleShare(e, id)}
                              aria-label={`${nameOf(id)} หาร ${e.title}`}
                              title={parts.has(id) ? `฿${formatBaht(parts.get(id)!)}` : undefined}
                              className="size-4 accent-sky-600"
                            />
                          </td>
                        ))}
                        <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums text-slate-500 group-hover:bg-slate-50">{parts.size}</td>
                        <td className="border-b border-slate-100 px-4 py-2 text-right tabular-nums group-hover:bg-slate-50">
                          {each === null ? "–" : formatBaht(each)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5">รวม</td>
                    <td className="bg-slate-50 px-3 py-2.5 text-right tabular-nums">{formatBaht(result.total)}</td>
                    {columns.map((id) => (
                      <td key={id} className="bg-slate-50 px-1 py-2.5 text-center text-xs tabular-nums" title={`ส่วนของ ${nameOf(id)}`}>
                        {formatBaht(balanceOf.get(id)?.owed ?? 0)}
                      </td>
                    ))}
                    <td className="bg-slate-50" colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </main>

      {dialog && (
        <ExpenseDialog
          key={`${dialog.expense?.id ?? "new"}-${dialog.n}`}
          tripId={trip.id}
          expense={dialog.expense}
          choices={dialogChoices(dialog.expense)}
          pool={pool}
          onClose={closeDialog}
          onAgain={addAnother}
        />
      )}
    </div>
  );
}
