"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { banUser, deleteUser, setBoardFeature, setFeature, unbanUser } from "@/app/back-office-actions";
import { ExclamationIcon, TrashIcon } from "@/components/icons";
import { Modal, useModalClose } from "@/components/modal";
import { dangerBtn, ghostBtn, inputCls, labelCls } from "@/components/ui";
import type { AppUser } from "@/lib/back-office-store";
import type { BoardFeatureKey, FeatureKey } from "@/lib/features";

const smallBtn = "px-2.5 py-1.5 text-xs";

// ---------- tabs ----------

const TABS = [
  { href: "/back-office", label: "ภาพรวม", match: (p: string) => p === "/back-office" },
  { href: "/back-office/features", label: "ฟีเจอร์", match: (p: string) => p.startsWith("/back-office/features") },
  { href: "/back-office/announcements", label: "ประกาศ", match: (p: string) => p.startsWith("/back-office/announcements") },
  { href: "/back-office/users", label: "ผู้ใช้", match: (p: string) => p.startsWith("/back-office/users") },
  { href: "/back-office/boards", label: "บอร์ด", match: (p: string) => p.startsWith("/back-office/boards") },
];

export function BackOfficeNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="เมนูหลังบ้าน" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex rounded-full bg-black/[0.05] p-1 text-sm">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 font-medium transition ${
                active ? "bg-white text-slate-900 shadow-[0_1px_3px_rgb(0_0_0/0.1)]" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ---------- switches ----------

/** iOS-style on / off switch. */
export function Switch({ on, onChange, disabled, label }: { on: boolean; onChange: (on: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-60 ${
        on ? "bg-[#34c759]" : "bg-black/[0.12]"
      }`}
    >
      <span
        className={`absolute left-0.5 size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          on ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

/** A whole-app switch on /back-office/features. */
export function FeatureSwitch({ featureKey, label, enabled }: { featureKey: FeatureKey; label: string; enabled: boolean }) {
  const [on, setOn] = useOptimistic(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const change = (next: boolean) =>
    start(async () => {
      setOn(next);
      setError(await setFeature(featureKey, next));
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <Switch on={on} onChange={change} disabled={pending} label={label} />
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

const OVERRIDE_OPTIONS = [
  { value: null, label: "ตามระบบ" },
  { value: true, label: "เปิด" },
  { value: false, label: "ปิด" },
] as const;

/** One board's setting for a switch: follow the whole app, or force on / off. */
export function BoardFeatureControl({
  boardId, featureKey, label, override, globalOn,
}: {
  boardId: number;
  featureKey: BoardFeatureKey;
  label: string;
  override: boolean | null;
  globalOn: boolean;
}) {
  const [value, setValue] = useOptimistic(override);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const change = (next: boolean | null) =>
    start(async () => {
      setValue(next);
      setError(await setBoardFeature(boardId, featureKey, next));
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-black/[0.05] p-0.5 text-xs">
        {OVERRIDE_OPTIONS.map((o) => {
          const active = value === o.value;
          const tint = o.value === true ? "text-[#248a3d]" : o.value === false ? "text-[#d70015]" : "text-slate-900";
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => change(o.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition disabled:opacity-60 ${
                active ? `bg-white shadow-[0_1px_3px_rgb(0_0_0/0.1)] ${tint}` : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {o.label}
              {o.value === null && <span className="font-normal text-slate-400"> ({globalOn ? "เปิด" : "ปิด"})</span>}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

// ---------- users ----------

function BanForm({ user }: { user: AppUser }) {
  const close = useModalClose();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    start(async () => {
      const err = await banUser(user.id, reason);
      setError(err);
      if (!err) close();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 px-5 py-4">
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{user.email}</span> จะถูกออกจากระบบทันที และเข้าสู่ระบบอีกไม่ได้จนกว่าจะปลดระงับ
        ชื่อในบอร์ดและข้อมูลทริป / บิลยังอยู่ครบ
      </p>
      <div>
        <label htmlFor="ban-reason" className={labelCls}>เหตุผล (ไม่บังคับ เห็นเฉพาะในหลังบ้าน)</label>
        <input id="ban-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} autoFocus className={inputCls} />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={close} className={ghostBtn}>ยกเลิก</button>
        <button disabled={pending} className={`${dangerBtn} bg-[#ff9500] text-white hover:bg-[#c93400]`}>
          {pending ? "กำลังระงับ…" : "ระงับบัญชี"}
        </button>
      </div>
    </form>
  );
}

function DeleteUserForm({ user }: { user: AppUser }) {
  const close = useModalClose();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const matches = typed.trim().toLowerCase() === user.email.toLowerCase();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!matches) return;
    start(async () => {
      const err = await deleteUser(user.id, typed);
      setError(err);
      if (!err) close();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 px-5 py-4">
      <div className="flex gap-3 rounded-2xl bg-[#ff3b30]/8 p-3.5 text-sm text-[#d70015]">
        <ExclamationIcon className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">ลบแล้วกู้คืนไม่ได้</p>
          <ul className="mt-1 list-disc pl-4">
            <li>บัญชีถูกลบ และออกจากระบบทุกเครื่อง</li>
            {user.boards.length > 0 && (
              <li>ชื่อใน {user.boards.length} บอร์ดยังอยู่พร้อมทริป / บิล แต่กลายเป็นชื่อว่างที่คนอื่นเลือกได้</li>
            )}
            <li>ถ้าเปิดรับสมาชิกใหม่อยู่ เขาสมัครกลับมาใหม่ได้ (ถ้าไม่อยากให้กลับมา ให้ระงับแทน)</li>
          </ul>
        </div>
      </div>
      <div>
        <label htmlFor="confirm-user-email" className={labelCls}>
          พิมพ์อีเมล <span className="font-semibold text-slate-900">{user.email}</span> เพื่อยืนยัน
        </label>
        <input id="confirm-user-email" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus className={inputCls} />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={close} className={ghostBtn}>ยกเลิก</button>
        <button disabled={!matches || pending} className={`${dangerBtn} bg-[#ff3b30] text-white hover:bg-[#d70015] disabled:opacity-40`}>
          <TrashIcon className="size-4" />
          {pending ? "กำลังลบ…" : "ลบบัญชีถาวร"}
        </button>
      </div>
    </form>
  );
}

export function UserActions({ user }: { user: AppUser }) {
  const [open, setOpen] = useState<"ban" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {user.banned ? (
          <button
            disabled={pending}
            onClick={() => start(async () => setError(await unbanUser(user.id)))}
            className={`${ghostBtn} ${smallBtn}`}
          >
            {pending ? "กำลังปลด…" : "ปลดระงับ"}
          </button>
        ) : (
          <button onClick={() => setOpen("ban")} className={`${ghostBtn} ${smallBtn}`}>ระงับ</button>
        )}
        <button onClick={() => setOpen("delete")} className={`${dangerBtn} ${smallBtn}`}>
          <TrashIcon className="size-3.5" />ลบ
        </button>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}

      {open === "ban" && (
        <Modal title={`ระงับ ${user.name}`} onClose={() => setOpen(null)} size="max-w-md">
          <BanForm user={user} />
        </Modal>
      )}
      {open === "delete" && (
        <Modal title={`ลบบัญชี ${user.name}`} onClose={() => setOpen(null)} size="max-w-md">
          <DeleteUserForm user={user} />
        </Modal>
      )}
    </div>
  );
}
