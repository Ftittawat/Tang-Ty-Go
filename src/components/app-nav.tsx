"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { BoardIcon, ChevronLeftIcon, GearIcon, MapIcon } from "@/components/icons";
import { iconBtn, Logo, pageCls } from "@/components/ui";

const TABS = [
  { href: "/", label: "บอร์ด", icon: BoardIcon, match: (p: string) => p === "/" },
  { href: "/plans", label: "แผนเที่ยว", icon: MapIcon, match: (p: string) => p.startsWith("/plans") },
];

type Pill = { left: number; width: number };

/**
 * Where the white pill was on screen when the last header unmounted (mid-slide included). Every
 * page renders its own header, so the tabs remount on navigation; the new header starts the pill
 * here and carries on sliding instead of popping in at the new tab.
 */
let lastPill: Pill | null = null;

/** Logo + section tabs (an iOS-style segmented control with a sliding pill), shared by every page header. */
export function AppNav() {
  const pathname = usePathname();
  const routeIdx = TABS.findIndex((t) => t.match(pathname));
  // Clicking moves the pill right away; the new page then takes over with the same index.
  const [clicked, setClicked] = useState<{ idx: number; from: string } | null>(null);
  const idx = clicked && clicked.from === pathname ? clicked.idx : routeIdx;
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const pillRef = useRef<HTMLSpanElement>(null);
  const mounted = useRef(false);

  // Remember the pill's on-screen spot as this header goes away (offsetLeft follows a running transition).
  useLayoutEffect(
    () => () => {
      const p = pillRef.current;
      lastPill = p && p.style.opacity !== "0" ? { left: p.offsetLeft, width: p.offsetWidth } : null;
    },
    [],
  );

  // Positioned straight on the DOM node: this runs after the old header's cleanup above in the same
  // commit, so `lastPill` is fresh here (it isn't yet during render).
  useLayoutEffect(() => {
    const p = pillRef.current;
    const el = tabRefs.current[idx];
    if (!p) return;
    if (!el) {
      p.style.opacity = "0";
      return;
    }
    const place = (left: number, width: number) => {
      p.style.left = `${left}px`;
      p.style.width = `${width}px`;
    };
    const jump = (left: number, width: number) => {
      p.style.transition = "none";
      place(left, width);
      p.getBoundingClientRect(); // flush, so the next change animates from here
      p.style.transition = "";
    };
    if (!mounted.current) {
      mounted.current = true;
      // Start where the previous page's pill was (or right on the tab on a fresh load).
      if (lastPill) jump(lastPill.left, lastPill.width);
      else jump(el.offsetLeft, el.offsetWidth);
    }
    p.style.opacity = "1";
    place(el.offsetLeft, el.offsetWidth);
  }, [idx]);

  return (
    <div className="flex items-center gap-3">
      <Link href="/" aria-label="Tang-Ty Go — หน้าแรก" className="flex shrink-0 items-center gap-2.5">
        <Logo className="size-9 shadow-card" />
        <span className="hidden text-[15px] font-semibold tracking-tight lg:inline">Tang-Ty Go</span>
      </Link>
      <nav className="relative flex rounded-full bg-black/[0.05] p-1 text-sm" aria-label="เมนูหลัก">
        <span
          ref={pillRef}
          aria-hidden
          style={{ opacity: 0 }}
          className="absolute top-1 bottom-1 left-0 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.1)] transition-[left,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
        />
        {TABS.map((t, i) => {
          const active = i === idx;
          return (
            <Link
              key={t.href}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              href={t.href}
              onClick={() => setClicked({ idx: i, from: pathname })}
              aria-current={i === routeIdx ? "page" : undefined}
              className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition-colors duration-300 ${
                active ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
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

/**
 * Sticky frosted top bar used by every page. Same width everywhere so the logo, tabs and
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
    <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-[#f5f5f7]/75 backdrop-blur-xl backdrop-saturate-150">
      <div className={`${pageCls} flex flex-wrap items-center gap-x-2 gap-y-3 py-3`}>
        <AppNav />
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
