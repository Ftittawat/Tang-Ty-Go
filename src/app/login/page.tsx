"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions";
import { ShuttlecockIcon } from "@/components/icons";
import { ghostBtn, inputCls, Logo, primaryBtn } from "@/components/ui";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-b from-[#bcd8ff] via-[#eef2f8] to-[#c6efd6] px-4">
      <span aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-sky-400/35 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-[#ffcc00]/25 blur-3xl" />
      <form action={action} className="relative w-full max-w-sm space-y-4 rounded-[32px] bg-white/80 p-8 shadow-lift ring-1 ring-black/[0.04] backdrop-blur-xl">
        <div className="text-center">
          <Logo className="mx-auto size-28 shadow-lift" />
          <h1 className="sr-only">Tang-Ty Go</h1>
          <p className="mt-5 text-xl font-semibold">ยินดีต้อนรับกลับมา</p>
          <p className="mt-1 text-sm text-slate-500">ใส่รหัสผ่านของแก๊งเพื่อเข้าบอร์ดทริป</p>
        </div>
        <input
          name="password"
          type="password"
          placeholder="รหัสผ่าน"
          aria-label="รหัสผ่าน"
          required
          autoFocus
          autoComplete="current-password"
          className={`${inputCls} py-2.5 text-center`}
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button disabled={pending} className={`${primaryBtn} w-full py-2.5`}>
          {pending ? "กำลังตรวจสอบ…" : "เข้าสู่บอร์ด"}
        </button>
        <div className="flex items-center gap-3 text-xs text-slate-400" aria-hidden>
          <span className="h-px flex-1 bg-black/[0.08]" />หรือ<span className="h-px flex-1 bg-black/[0.08]" />
        </div>
        {/* /badminton is public (see proxy.ts): no password needed. */}
        <Link href="/badminton" className={`${ghostBtn} w-full py-2.5`}>
          <ShuttlecockIcon className="size-4 text-[#248a3d]" />
          ลงชื่อตีแบด
        </Link>
      </form>
    </main>
  );
}
