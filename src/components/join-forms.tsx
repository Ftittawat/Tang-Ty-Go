"use client";

import { useActionState, useState, useTransition } from "react";
import { createBoard, findBoard, joinBoard, switchBoard } from "@/app/board-actions";
import { CheckIcon } from "@/components/icons";
import { Avatar, ghostBtn, inputCls, labelCls, primaryBtn } from "@/components/ui";
import { BOARD_NAME_MAX, MEMBER_NAME_MAX, type Member } from "@/lib/trips";

const errorCls = "rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600";

export function CodeForm() {
  const [state, action, pending] = useActionState(findBoard, null);
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="board-code" className={labelCls}>รหัสสำหรับเข้าร่วมบอร์ด</label>
      <div className="flex gap-2">
        <input
          id="board-code"
          name="code"
          placeholder="XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          className={`${inputCls} min-w-0 flex-1 font-mono tracking-widest uppercase`}
        />
        <button disabled={pending} className={`${primaryBtn} shrink-0`}>{pending ? "กำลังค้นหา…" : "ถัดไป"}</button>
      </div>
      {state?.error && <p key={state.at} className={errorCls}>{state.error}</p>}
    </form>
  );
}

export function CreateBoardForm() {
  const [state, action, pending] = useActionState(createBoard, null);
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="board-name" className={labelCls}>สร้างบอร์ดใหม่ (Admin only)</label>
      <div className="flex gap-2">
        <input
          id="board-name"
          name="name"
          placeholder="ชื่อบอร์ด"
          maxLength={BOARD_NAME_MAX}
          autoComplete="off"
          required
          className={`${inputCls} min-w-0 flex-1`}
        />
        <button disabled={pending} className={`${ghostBtn} shrink-0`}>{pending ? "กำลังสร้าง…" : "สร้าง"}</button>
      </div>
      {state?.error && <p key={state.at} className={errorCls}>{state.error}</p>}
    </form>
  );
}

export function SwitchBoardButton({ id, children, className = ghostBtn }: { id: number; children: React.ReactNode; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button onClick={() => start(() => switchBoard(id))} disabled={pending} className={className}>
      {children}
    </button>
  );
}

/**
 * Pick a nickname for this board. Names already on the board that nobody signed in as yet can be
 * claimed instead, so the trips and bills under that name become yours.
 */
export function JoinForm({ code, suggested, unclaimed }: { code: string; suggested: string; unclaimed: Member[] }) {
  const [state, action, pending] = useActionState(joinBoard, null);
  const [claim, setClaim] = useState<number | null>(null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      {claim !== null && <input type="hidden" name="claim_id" value={claim} />}

      {unclaimed.length > 0 && (
        <div>
          <p className={labelCls}>มีชื่อคุณอยู่แล้วไหม? เลือกเพื่อใช้ชื่อนั้น (ทริปและบิลเดิมจะเป็นของคุณ)</p>
          <div className="flex flex-wrap gap-1.5">
            {unclaimed.map((m) => {
              const on = claim === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setClaim(on ? null : m.id)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-sm ring-1 transition ${
                    on ? "bg-sky-600 text-white ring-sky-600" : "bg-white text-slate-700 ring-black/8 hover:ring-black/20"
                  }`}
                >
                  {on ? <CheckIcon className="size-6 p-1" /> : <Avatar name={m.name} />}
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {claim === null && (
        <div>
          <label htmlFor="nickname" className={labelCls}>
            {unclaimed.length > 0 ? "หรือตั้งชื่อเล่นใหม่" : "ชื่อเล่นของคุณในบอร์ดนี้"}
          </label>
          <input
            id="nickname"
            name="name"
            defaultValue={suggested}
            maxLength={MEMBER_NAME_MAX}
            autoComplete="nickname"
            required
            autoFocus
            className={inputCls}
          />
          <p className="mt-1 text-xs text-slate-400">เพื่อนๆ จะเห็นชื่อนี้ในทริปและบิล — เปลี่ยนทีหลังได้ในหน้าตั้งค่า</p>
        </div>
      )}

      {state?.error && <p key={state.at} className={errorCls}>{state.error}</p>}
      <button disabled={pending} className={`${primaryBtn} w-full py-2.5`}>
        {pending ? "กำลังเข้าร่วม…" : claim !== null ? `เข้าร่วมในชื่อ “${unclaimed.find((m) => m.id === claim)?.name}”` : "เข้าร่วมบอร์ด"}
      </button>
    </form>
  );
}
