"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";
import { inputCls, Logo, primaryBtn } from "@/components/ui";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-white to-teal-50 px-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-7 shadow-xl shadow-sky-900/5 backdrop-blur">
        <div className="text-center">
          <Logo className="mx-auto size-32 shadow-lg shadow-sky-900/15" />
          <h1 className="sr-only">Tang-Ty Go</h1>
          <p className="mt-4 text-sm text-slate-500">ใส่รหัสผ่านของแก๊งเพื่อเข้าบอร์ดทริป</p>
        </div>
        <input
          name="password"
          type="password"
          placeholder="รหัสผ่าน"
          aria-label="รหัสผ่าน"
          required
          autoFocus
          autoComplete="current-password"
          className={inputCls}
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button disabled={pending} className={`${primaryBtn} w-full`}>
          {pending ? "กำลังตรวจสอบ…" : "เข้าสู่บอร์ด"}
        </button>
      </form>
    </main>
  );
}
