"use client";

import { Select } from "@/components/select";
import { startTransition, useActionState, useEffect, useOptimistic, useRef, useState, useTransition, type FormEvent } from "react";
import { addMembers, removeMember, renameMember, setMemberRole } from "@/app/actions";
import { Avatar, dangerBtn, ghostBtn, inputCls, pillCls, primaryBtn } from "@/components/ui";
import { MEMBER_NAME_MAX, ROLES, type Member, type Role } from "@/lib/trips";

const ROLE_PILL: Record<Role, string> = {
  admin: "bg-[#ff9500]/12 text-[#c93400]",
  member: "bg-black/[0.05] text-slate-500",
};

function MemberRow({ member, used, canEdit, isMe }: { member: Member; used: number; canEdit: boolean; isMe: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [role, setRole] = useOptimistic(member.role);

  const cancel = () => {
    setName(member.name);
    setError(null);
    setEditing(false);
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() === member.name) return cancel();
    start(async () => {
      const err = await renameMember(member.id, name);
      setError(err);
      if (!err) setEditing(false);
    });
  };

  const changeRole = (next: Role) =>
    start(async () => {
      setRole(next);
      setError(await setMemberRole(member.id, next));
    });

  const remove = () => {
    const notes = [
      member.linked && "คนนี้จะถูกเอาออกจากบอร์ด (ต้องใช้รหัสบอร์ดเพื่อเข้ามาใหม่)",
      used > 0 && `ชื่อนี้อยู่ใน ${used} ทริป — จะถูกเอาออกจากทริปเหล่านั้น`,
    ].filter(Boolean);
    if (!confirm(`ลบ “${member.name}” ออกจากรายชื่อ?${notes.map((n) => `\n${n}`).join("")}`)) return;
    start(() => removeMember(member.id));
  };

  const rolePill = <span className={`${pillCls} ${ROLE_PILL[role]}`}>{ROLES.find((r) => r.id === role)?.label}</span>;

  return (
    <li className="py-2.5">
      {editing ? (
        <form onSubmit={save} className="flex items-center gap-2">
          <Avatar name={name || "?"} className="size-8 text-sm" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && cancel()}
            maxLength={MEMBER_NAME_MAX}
            autoFocus
            aria-label="ชื่อ"
            className={`${inputCls} min-w-0 flex-1`}
          />
          <button disabled={pending} className={primaryBtn}>บันทึก</button>
          <button type="button" onClick={cancel} className={ghostBtn}>ยกเลิก</button>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <Avatar name={member.name} className="size-8 text-sm" />
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-medium">{member.name}</span>
              {isMe && <span className="shrink-0 text-xs text-slate-400">(คุณ)</span>}
            </span>
            <span className="block truncate text-xs text-slate-400">
              {member.linked ? "เข้าร่วมแล้ว" : "ชื่ออย่างเดียว — ยังไม่มีใครเข้าร่วมในชื่อนี้"}
            </span>
          </div>
          <span className="hidden text-xs text-slate-400 sm:inline">{used > 0 ? `${used} ทริป` : "ยังไม่มีทริป"}</span>
          {canEdit && member.linked ? (
            <Select
              value={role}
              onChange={(v) => changeRole(v as Role)}
              disabled={pending}
              aria-label={`สิทธิ์ของ ${member.name}`}
              title={ROLES.find((r) => r.id === role)?.hint}
              options={ROLES.map((r) => ({ value: r.id, label: r.label }))}
              align="right"
              buttonClassName={`${pillCls} ${ROLE_PILL[role]} cursor-pointer py-1 outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40`}
            />
          ) : member.linked && rolePill}
          {canEdit && (
            <>
              <button onClick={() => setEditing(true)} disabled={pending} className={`${ghostBtn} px-2.5 py-1.5 text-xs`}>
                แก้ชื่อ
              </button>
              {!isMe && (
                <button onClick={remove} disabled={pending} className={`${dangerBtn} px-2.5 py-1.5 text-xs`}>
                  ลบ
                </button>
              )}
            </>
          )}
        </div>
      )}
      {error && <p className="mt-1 pl-11 text-sm text-rose-600">{error}</p>}
    </li>
  );
}

export function MembersManager({
  members, usage, isAdmin, meId,
}: {
  members: Member[];
  usage: Record<number, number>;
  isAdmin: boolean;
  meId: number | null;
}) {
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
      {isAdmin && (
        <>
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              name="names"
              placeholder="เพิ่มชื่อคนที่ไม่ได้ใช้แอป — คั่นด้วย , เช่น ต้น, แบม"
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
        </>
      )}

      {members.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-slate-400">
          ยังไม่มีรายชื่อ — เพิ่มชื่อเพื่อนในแก๊งได้เลย
        </p>
      ) : (
        <ul className={`divide-y divide-black/[0.05] ${isAdmin ? "mt-2" : ""}`}>
          {members.map((m) => (
            <MemberRow
              key={`${m.id}:${m.name}:${m.role}`}
              member={m}
              used={usage[m.id] ?? 0}
              canEdit={isAdmin}
              isMe={m.id === meId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
