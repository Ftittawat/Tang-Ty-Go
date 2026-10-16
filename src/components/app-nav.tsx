"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BoardIcon, ChevronLeftIcon, GearIcon, MapIcon } from "@/components/icons";
import { iconBtn, Logo, pageCls } from "@/components/ui";

const TABS = [
  { href: "/", label: "บอร์ด", icon: BoardIcon, match: (p: string) => p === "/" },
  { href: "/plans", label: "แผนเที่ยว", icon: MapIcon, match: (p: string) => p.startsWith("/plans") },
];

/** Logo + section tabs (an iOS-style segmented control), shared by every page header. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-3">
      <Link href="/" aria-label="Tang-Ty Go — หน้าแรก" className="flex shrink-0 items-center gap-2.5">
        <Logo className="size-9 shadow-card" />
        <span className="hidden text-[15px] font-semibold tracking-tight lg:inline">Tang-Ty Go</span>
      </Link>
      <nav className="flex rounded-full bg-black/[0.05] p-1 text-sm" aria-label="เมนูหลัก">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition ${
                active ? "bg-white text-slate-900 shadow-[0_1px_3px_rgb(0_0_0/0.1)]" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <t.icon className="size-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Logo + app name instead of the tabs, for the public badminton page (no password, so no tabs). */
function AppBrand() {
  return (
    <Link href="/" aria-label="Tang-Ty Go — หน้าแรก" className="flex shrink-0 items-center gap-2.5">
      <Logo className="size-9 shadow-card" />
      <span className="text-[15px] font-semibold tracking-tight">Tang-Ty Go</span>
    </Link>
  );
}

/**
 * Sticky frosted top bar used by every page. Same width everywhere so the logo, tabs and
 * buttons stay put when switching pages. `children` go between the tabs and the gear.
 */
export function AppHeader({
  children, below, settings = true, tabs = true,
}: {
  children?: ReactNode;
  /** Extra row inside the sticky bar (e.g. the board's filters on phones). */
  below?: ReactNode;
  settings?: boolean;
  /** false on public pages: just the logo, no section tabs. */
  tabs?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-[#f5f5f7]/75 backdrop-blur-xl backdrop-saturate-150">
      <div className={`${pageCls} flex flex-wrap items-center gap-x-2 gap-y-3 py-3`}>
        {tabs ? <AppNav /> : <AppBrand />}
        <div className="ml-auto flex items-center gap-2">
          {children}
          {settings && (
            <Link href="/settings" className={iconBtn} title="ตั้งค่า" aria-label="ตั้งค่า">
              <GearIcon className="size-[18px]" />
            </Link>
          )}
        </div>
      </div>
      {below}
    </header>
  );
}

/** Large page title with an optional back link, in the style of an iOS navigation title. */
export function PageTitle({
  back, title, subtitle, actions,
}: {
  back?: { href: string; label: string };
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div>
      {back && (
        <Link href={back.href} className="-ml-1 inline-flex items-center gap-0.5 text-sm font-medium text-sky-600 hover:text-sky-700">
          <ChevronLeftIcon className="size-4" />
          {back.label}
        </Link>
      )}
      <div className={`flex items-start gap-3 ${back ? "mt-2" : ""}`}>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-normal break-words sm:text-[28px]">{title}</h1>
          {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
