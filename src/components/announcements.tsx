"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { dismissAnnouncement } from "@/app/actions";
import { ExclamationIcon, MegaphoneIcon, SparklesIcon, XMarkIcon } from "@/components/icons";
import { closeBtn, pageCls } from "@/components/ui";
import type { Announcement, Tone } from "@/lib/announcements";

const TONE_STYLE: Record<Tone, { icon: typeof MegaphoneIcon; tint: string; ring: string }> = {
  info: { icon: MegaphoneIcon, tint: "bg-sky-600", ring: "ring-sky-600/15" },
  warning: { icon: ExclamationIcon, tint: "bg-[#ff9500]", ring: "ring-[#ff9500]/25" },
  success: { icon: SparklesIcon, tint: "bg-[#34c759]", ring: "ring-[#34c759]/20" },
};

/** One announcement card (also used as the live preview in the back office). */
export function AnnouncementCard({ a, onDismiss }: { a: Pick<Announcement, "title" | "body" | "tone" | "dismissible">; onDismiss?: () => void }) {
  const s = TONE_STYLE[a.tone];
  return (
    <div role="status" className={`flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-card ring-1 ${s.ring}`}>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-white ${s.tint}`}>
        <s.icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1 self-center">
        <p className="text-[15px] font-semibold leading-snug wrap-break-word">{a.title || "หัวข้อประกาศ"}</p>
        {a.body && <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-slate-600 wrap-break-word">{a.body}</p>}
      </div>
      {a.dismissible && (
        <button type="button" onClick={onDismiss} className={closeBtn} aria-label="ปิดประกาศนี้" title="ปิดประกาศนี้ (จะไม่แสดงอีก)">
          <XMarkIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

type Ctx = { items: Announcement[]; dismiss: (id: number) => void };
const AnnouncementsContext = createContext<Ctx>({ items: [], dismiss: () => {} });

/**
 * Holds the signed-in user's announcements (first batch from the root layout) and keeps them fresh:
 * re-read on every navigation and when the tab comes back into view.
 */
export function AnnouncementsProvider({ initial, children }: { initial: Announcement[] | null; children: ReactNode }) {
  const [items, setItems] = useState(initial ?? []);
  const [, start] = useTransition();
  const pathname = usePathname();
  const signedIn = initial !== null;

  useEffect(() => {
    if (!signedIn) return;
    let stale = false;
    const load = () =>
      fetch("/api/announcements", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<Announcement[]>) : null))
        .then((next) => {
          if (next && !stale) setItems(next);
        })
        .catch(() => {});
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stale = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname, signedIn]);

  const dismiss = (id: number) => {
    setItems((cur) => cur.filter((a) => a.id !== id));
    start(() => dismissAnnouncement(id));
  };

  return <AnnouncementsContext value={{ items, dismiss }}>{children}</AnnouncementsContext>;
}

/** Live announcements, under the app header on every page that has one. */
export function AnnouncementList() {
  const { items, dismiss } = useContext(AnnouncementsContext);
  if (items.length === 0) return null;
  return (
    <section aria-label="ประกาศ" className={`${pageCls} space-y-2 pt-4`}>
      {items.map((a) => (
        <AnnouncementCard key={a.id} a={a} onDismiss={() => dismiss(a.id)} />
      ))}
    </section>
  );
}
