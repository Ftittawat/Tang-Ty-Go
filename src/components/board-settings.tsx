"use client";

import { useState, useTransition, type FormEvent } from "react";
import { renameMember } from "@/app/actions";
import { renameBoard, resetBoardCode } from "@/app/board-actions";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { ghostBtn, inputCls, labelCls, primaryBtn } from "@/components/ui";
import { BOARD_NAME_MAX, MEMBER_NAME_MAX } from "@/lib/trips";

/** One text field + save button that calls `save` and shows its error, if any. */
function InlineEdit({
  id, label, value, max, save, hint,
}: {
  id: string;
  label: string;
  value: string;
  max: number;
  save: (v: string) => Promise<string | null>;
  hint?: string;
}) {
  const [text, setText] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const dirty = text.trim() !== value;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    start(async () => {
      const err = await save(text);
      setError(err);
      setSaved(!err);
    });
  };

  return (
    <form onSubmit={submit}>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <div className="flex gap-2">
        <input
          id={id}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          maxLength={max}
          required
          className={`${inputCls} min-w-0 flex-1`}
        />
        <button disabled={pending || !dirty} className={`${primaryBtn} shrink-0`}>
          {saved && !dirty ? <><CheckIcon className="size-4" />บันทึกแล้ว</> : pending ? "กำลังบันทึก…" : "บันทึก"}
        </button>
      </div>
      {error ? <p className="mt-1 text-sm text-rose-600">{error}</p> : hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </form>
  );
}

export function NicknameForm({ memberId, name }: { memberId: number; name: string }) {
  return (
    <InlineEdit
      id="my-nickname"
      label="ชื่อเล่นของฉันในบอร์ดนี้"
      value={name}
      max={MEMBER_NAME_MAX}
      save={(v) => renameMember(memberId, v)}
      hint="เพื่อน ๆ จะเห็นชื่อนี้ในทริปและบิลทั้งหมด"
    />
  );
}

export function BoardNameForm({ name }: { name: string }) {
  return <InlineEdit id="board-name" label="ชื่อบอร์ด" value={name} max={BOARD_NAME_MAX} save={renameBoard} />;
}

function CopyButton({ text, label }: { text: () => string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text());
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={ghostBtn}
    >
      {copied ? <CheckIcon className="size-4 text-emerald-600" /> : <CopyIcon className="size-4" />}
      {copied ? "คัดลอกแล้ว" : label}
    </button>
  );
}

/** The invite code (and link) anyone on the board can hand out; only admins can reset it (the old one stops working). */
export function BoardCode({ code, canReset }: { code: string; canReset: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div>
      <p className={labelCls}>รหัสบอร์ด — ส่งให้เพื่อนเพื่อเข้าร่วม</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-xl bg-black/[0.05] px-4 py-2 font-mono text-lg font-semibold tracking-[0.2em] select-all">{code}</span>
        <CopyButton text={() => code} label="คัดลอกรหัส" />
        <CopyButton text={() => `${window.location.origin}/join/${code}`} label="คัดลอกลิงก์เชิญ" />
      </div>
      {canReset && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("เปลี่ยนรหัสบอร์ด?\nรหัสและลิงก์เดิมจะใช้เข้าร่วมไม่ได้อีก (คนที่อยู่ในบอร์ดแล้วไม่ได้รับผลกระทบ)")) {
              start(() => resetBoardCode());
            }
          }}
          className="mt-2 text-xs font-medium text-slate-500 underline-offset-2 hover:text-rose-600 hover:underline"
        >
          {pending ? "กำลังเปลี่ยนรหัส…" : "เปลี่ยนรหัสใหม่"}
        </button>
      )}
    </div>
  );
}
