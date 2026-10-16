import { CheckIcon } from "@/components/icons";
import type { Member } from "@/lib/trips";

/** Page frame shared by the header and every page's content, so widths never jump between pages. */
export const pageCls = "mx-auto w-full max-w-[1400px] px-4 sm:px-6";

/** White rounded surface used for cards and page sections. */
export const surfaceCls = "rounded-3xl bg-white shadow-card ring-1 ring-black/[0.04]";

export const fieldCls =
  "rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15 disabled:bg-slate-50";

export const inputCls = `${fieldCls} w-full`;

export const labelCls = "mb-1.5 block text-xs font-medium text-slate-600";

export const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_122_255/0.25),0_4px_12px_-4px_rgb(0_122_255/0.45)] transition hover:bg-sky-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

export const ghostBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-black/[0.08] transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60";

export const dangerBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-[#ff3b30] transition hover:bg-[#ff3b30]/10 disabled:opacity-60";

/** Round white icon button (column "+", settings gear). */
export const iconBtn =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-card ring-1 ring-black/[0.04] transition hover:text-slate-900 hover:shadow-lift active:scale-95";

/** Round gray "✕" in a sheet's header. */
export const closeBtn =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-slate-500 transition hover:bg-black/[0.08] hover:text-slate-800";

/** Small tinted pill, e.g. "ทะเล" on a card. */
export const pillCls = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium";

export function Logo({ className = "size-9" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="" width={256} height={256} className={`rounded-[23%] ${className}`} />;
}

// Two-tone fills in the spirit of iOS contact monograms.
const AVATAR_COLORS = [
  "from-[#ff9aa8] to-[#ff5c77]",
  "from-[#ffc078] to-[#ff9500]",
  "from-[#86e3a6] to-[#30c15a]",
  "from-[#78d8e8] to-[#2fb4cc]",
  "from-[#86bdff] to-[#2f86ff]",
  "from-[#aba7ff] to-[#6a5cff]",
  "from-[#e2a8f6] to-[#b65ce6]",
  "from-[#c3c7d0] to-[#8a8f9b]",
];

export function Avatar({ name, className = "size-6 text-[11px]" }: { name: string; className?: string }) {
  const hash = [...name].reduce((h, c) => (h * 31 + c.codePointAt(0)!) >>> 0, 7);
  // Skip Thai leading vowels (เ แ โ ใ ไ) so "แบม" shows "บ", not "แ".
  const initial = [...name.trim()].find((c) => !"เแโใไ".includes(c))?.toUpperCase() ?? "?";
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-linear-to-b font-semibold text-white ${AVATAR_COLORS[hash % AVATAR_COLORS.length]} ${className}`}
    >
      {initial}
    </span>
  );
}

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span className="flex items-center -space-x-2" title={names.join(", ")}>
      {shown.map((n) => (
        <Avatar key={n} name={n} className="size-7 text-xs ring-2 ring-white" />
      ))}
      {rest > 0 && (
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 ring-2 ring-white">
          +{rest}
        </span>
      )}
    </span>
  );
}

export function MemberChip({ member, selected, onClick }: { member: Member; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm ring-1 transition ${
        selected
          ? "bg-sky-600/10 font-medium text-sky-700 ring-sky-600/60"
          : "bg-white text-slate-600 ring-black/[0.08] hover:bg-slate-50"
      }`}
    >
      <Avatar name={member.name} />
      {member.name}
      {selected && <CheckIcon className="size-3.5 text-sky-600" />}
    </button>
  );
}
