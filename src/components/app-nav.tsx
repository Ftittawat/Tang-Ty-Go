"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { GearIcon, ghostBtn, Logo, pageCls } from "@/components/ui";

const TABS = [
  { href: "/", label: "บอร์ด", match: (p: string) => p === "/" },
  { href: "/plans", label: "แผนเที่ยว", match: (p: string) => p.startsWith("/plans") },
];

/** Logo + section tabs, shared by every page header. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-2.5">
      <Link href="/" aria-label="Tang-Ty Go — หน้าแรก" className="shrink-0">
        <Logo />
      </Link>
      <nav className="flex rounded-lg bg-slate-100 p-0.5 text-sm" aria-label="เมนูหลัก">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Sticky top bar used by every page. Same width everywhere so the logo, tabs and
 * buttons stay put when switching pages. `children` go between the tabs and the gear.
 */
export function AppHeader({
  children, below, settings = true,
}: {
  children?: ReactNode;
  /** Extra row inside the sticky bar (e.g. the board's filters on phones). */
  below?: ReactNode;
  settings?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className={`${pageCls} flex flex-wrap items-center gap-x-2 gap-y-3 py-3`}>
        <AppNav />
        <div className="ml-auto flex items-center gap-2">
          {children}
          {settings && (
            <Link href="/settings" className={`${ghostBtn} px-2.5`} title="ตั้งค่า" aria-label="ตั้งค่า">
              <GearIcon />
            </Link>
          )}
        </div>
      </div>
      {below}
    </header>
  );
}
