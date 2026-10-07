"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui";

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
