"use client";

import {
  startTransition, useActionState, useEffect, useOptimistic, useRef, useState, useTransition, type FormEvent,
} from "react";
import { addMembers, removeMember, renameMember, setMemberTags } from "@/app/actions";
import { Avatar, dangerBtn, ghostBtn, inputCls, pillCls, primaryBtn } from "@/components/ui";
import { MEMBER_NAME_MAX, MEMBER_TAGS, type Member, type MemberTag } from "@/lib/trips";

/** One toggle pill per tag; the last tag left can't be switched off. */
function TagPills({ value, onToggle, disabled }: { value: MemberTag[]; onToggle: (t: MemberTag) => void; disabled?: boolean }) {
  return (
    <span className="flex flex-wrap gap-1">
      {MEMBER_TAGS.map((t) => {
        const on = value.includes(t.id);
        const last = on && value.length === 1;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onToggle(t.id)}
            disabled={disabled || last}
            aria-pressed={on}
            title={last ? "ต้องมีอย่างน้อย 1 แท็ก" : `ใช้สำหรับ: ${t.hint}`}
            className={`${pillCls} py-0.5 ring-1 transition disabled:cursor-default ${
              on ? t.on : "bg-white text-slate-400 ring-black/[0.08] hover:text-slate-600"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </span>
  );
}

const toggled = (tags: MemberTag[], t: MemberTag) => (tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);

function MemberRow({ member, used }: { member: Member; used: number }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [tags, setTags] = useOptimistic(member.tags);

  const toggleTag = (t: MemberTag) => {
    const next = toggled(tags, t);
    start(async () => {
      setTags(next);
      await setMemberTags(member.id, next);
    });
  };

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
          <div className="min-w-0 flex-1">
            <span className="block truncate font-medium">{member.name}</span>
            <span className="mt-1 block"><TagPills value={tags} onToggle={toggleTag} /></span>
          </div>
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

const FILTERS = [{ id: "all", label: "ทั้งหมด" }, ...MEMBER_TAGS] as const;

export function MembersManager({ members, usage }: { members: Member[]; usage: Record<number, number> }) {
  const [state, action, pending] = useActionState(addMembers, null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [newTags, setNewTags] = useState<MemberTag[]>(["general"]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const shown = filter === "all" ? members : members.filter((m) => m.tags.includes(filter));

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
      <form onSubmit={onSubmit}>
        {newTags.map((t) => <input key={t} type="hidden" name="tags" value={t} />)}
        <div className="flex gap-2">
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
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          ใช้สำหรับ
          <TagPills value={newTags} onToggle={(t) => setNewTags((v) => toggled(v, t))} />
        </div>
      </form>
      {state && (
        <p key={state.at} className={`mt-2 text-sm ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>
          {state.message}
        </p>
      )}

      {members.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-slate-400">
          ยังไม่มีรายชื่อ — เพิ่มชื่อเพื่อนในแก๊งได้เลย
        </p>
      ) : (
        <>
          <div className="mt-4 flex gap-1 rounded-full bg-black/[0.05] p-1 text-xs" role="group" aria-label="กรองตามแท็ก">
            {FILTERS.map((f) => {
              const n = f.id === "all" ? members.length : members.filter((m) => m.tags.includes(f.id)).length;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`flex-1 rounded-full px-3 py-1.5 font-medium transition ${
                    filter === f.id ? "bg-white text-slate-900 shadow-[0_1px_3px_rgb(0_0_0/0.1)]" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {f.label} <span className="text-slate-400">{n}</span>
                </button>
              );
            })}
          </div>
          <ul className="mt-2 divide-y divide-black/[0.05]">
            {shown.map((m) => (
              <MemberRow key={`${m.id}:${m.name}`} member={m} used={usage[m.id] ?? 0} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
