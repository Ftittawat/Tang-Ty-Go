import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import { LogoutIcon } from "@/components/icons";
import { Logo } from "@/components/ui";

/** Centered card on the login gradient, for pages before you're on a board (/join…). */
export function OnboardingShell({ title, subtitle, email, children }: { title: ReactNode; subtitle?: ReactNode; email?: string; children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-b from-[#bcd8ff] via-[#eef2f8] to-[#c6efd6] px-4 py-10">
      <span aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-144 -translate-x-1/2 rounded-full bg-sky-400/35 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 size-112 rounded-full bg-[#ffcc00]/25 blur-3xl" />
      <div className="relative w-full max-w-md space-y-6 rounded-4xl bg-white/80 p-6 shadow-lift ring-1 ring-black/4 backdrop-blur-xl sm:p-8">
        <div className="text-center">
          <Logo className="mx-auto size-16 shadow-lift" />
          <h1 className="mt-4 text-xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
        {email && (
          <form action={logout} className="flex items-center justify-center gap-2 border-t border-black/[0.06] pt-4 text-xs text-slate-400">
            <span className="truncate">{email}</span>
            <button className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-900">
              <LogoutIcon className="size-3.5" />
              ออกจากระบบ
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
