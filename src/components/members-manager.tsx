"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { addMembers, removeMember, renameMember } from "@/app/actions";
import { Avatar, dangerBtn, ghostBtn, inputCls, primaryBtn } from "@/components/ui";
import { MEMBER_NAME_MAX, type Member } from "@/lib/trips";

function MemberRow({ member, used }: { member: Member; used: number }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() === member.name) return setEditing(false);
    start(async () => {
      const err = await renameMember(member.id, name);
      setError(err);
      if (!err) setEditing(false);
    });
  };

  const remove = () => {
    const note = used > 0 ? `\nชื่อนี้อยู่ใน ${used} ทริป — จะถูกเอาออกจากทริปเหล่านั้น` : "";
    if (!confirm(`ลบ “${member.name}” ออกจากรายชื่อ?${note}`)) return;
    start(() => removeMember(member.id));
  };

  return (
    <li className="py-2.5">
      {editing ? (
        <form onSubmit={save} className="flex items-center gap-2">
          <Avatar name={name || "?"} className="size-8 text-sm" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setName(member.name);
                setError(null);
                setEditing(false);
              }
            }}
            maxLength={MEMBER_NAME_MAX}
            autoFocus
            aria-label="ชื่อ"
            className={`${inputCls} min-w-0 flex-1`}
          />
          <button disabled={pending} className={primaryBtn}>บันทึก</button>
          <button
            type="button"
            onClick={() => {
              setName(member.name);
              setError(null);
              setEditing(false);
            }}
            className={ghostBtn}
          >
            ยกเลิก
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <Avatar name={member.name} className="size-8 text-sm" />
          <span className="min-w-0 flex-1 truncate font-medium">{member.name}</span>
          <span className="hidden text-xs text-slate-400 sm:inline">{used > 0 ? `${used} ทริป` : "ยังไม่มีทริป"}</span>
          <button onClick={() => setEditing(true)} disabled={pending} className={`${ghostBtn} px-2.5 py-1.5 text-xs`}>
            แก้ชื่อ
          </button>
          <button onClick={remove} disabled={pending} className={`${dangerBtn} px-2.5 py-1.5 text-xs`}>
            ลบ
          </button>
        </div>
      )}
      {error && <p className="mt-1 pl-11 text-sm text-rose-600">{error}</p>}
    </li>
  );
}

export function MembersManager({ members, usage }: { members: Member[]; usage: Record<number, number> }) {
  const [state, action, pending] = useActionState(addMembers, null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear the box only after a successful add, so a typo can be fixed in place.
  useEffect(() => {
    if (state?.ok && inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }, [state]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          name="names"
          placeholder="เพิ่มชื่อ — ใส่หลายคนได้ คั่นด้วย , เช่น ต้น, แบม"
          aria-label="ชื่อที่จะเพิ่ม"
          autoComplete="off"
          className={`${inputCls} min-w-0 flex-1`}
        />
        <button disabled={pending} className={`${primaryBtn} shrink-0`}>
          {pending ? "กำลังเพิ่ม…" : "เพิ่ม"}
        </button>
      </form>
      {state && (
        <p key={state.at} className={`mt-2 text-sm ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>
          {state.message}
        </p>
      )}

      {members.length === 0 ? (
        <p className="mt-4 rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
          ยังไม่มีรายชื่อ — เพิ่มชื่อเพื่อนในแก๊งได้เลย
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {members.map((m) => (
            <MemberRow key={`${m.id}:${m.name}`} member={m} used={usage[m.id] ?? 0} />
          ))}
        </ul>
      )}
    </div>
  );
}
