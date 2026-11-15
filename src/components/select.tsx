"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { CheckIcon } from "@/components/icons";
import { inputCls } from "@/components/ui";

export type SelectOption = { value: string; label: string };

const HIDDEN: CSSProperties = { position: "fixed", visibility: "hidden", top: 0, left: 0 };

/**
 * Dropdown that opens right under the field; used instead of <select> everywhere, since the
 * native macOS menu pops up over the field and hides its label. With `name` it submits through a
 * hidden input, so it drops into a <form> like a select. Uncontrolled with `defaultValue`, or
 * controlled with `value` + `onChange`.
 */
export function Select({
  id, name, options, defaultValue = "", value: controlled, onChange, disabled = false, title,
  "aria-label": ariaLabel, className = "", buttonClassName, align = "left",
}: {
  id?: string;
  name?: string;
  options: SelectOption[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
  className?: string;
  /** Replaces the default full-width field look (e.g. a small pill). */
  buttonClassName?: string;
  /** Which edge the list lines up with when it's wider than the button. */
  align?: "left" | "right";
}) {
  const listId = useId();
  const [own, setOwn] = useState(defaultValue);
  const value = controlled ?? own;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Starts fixed + hidden: rendered in the normal flow even once, the list would push the
  // (vertically centered) dialog around and the button would be measured in the wrong spot.
  const [place, setPlace] = useState<CSSProperties>(HIDDEN);
  const selectedIdx = Math.max(0, options.findIndex((o) => o.value === value));

  const show = () => {
    setActive(selectedIdx);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setPlace(HIDDEN);
  };
  const pick = (i: number) => {
    const v = options[i]?.value;
    if (v === undefined) return;
    setOwn(v);
    close();
    onChange?.(v);
  };

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setPlace(HIDDEN);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  /*
   * The list is position: fixed, placed from the button, so a scrolling dialog body (or the
   * dialog's footer) can't clip it. It opens upwards when there's more room above, and follows
   * the button while anything scrolls.
   */
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const b = buttonRef.current?.getBoundingClientRect();
      if (!b) return;
      const gap = 6;
      const margin = 8;
      const below = window.innerHeight - b.bottom - gap - margin;
      const above = b.top - gap - margin;
      const want = Math.min(256, listRef.current?.scrollHeight ?? 256);
      const up = below < want && above > below;
      setPlace({
        position: "fixed",
        minWidth: b.width,
        maxHeight: Math.max(96, Math.min(256, up ? above : below)),
        ...(up ? { bottom: window.innerHeight - b.top + gap } : { top: b.bottom + gap }),
        ...(align === "right" ? { right: window.innerWidth - b.right } : { left: b.left }),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, align]);

  // Keep the highlighted option in view while arrowing through a long list.
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    const moves: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
      PageDown: Math.min(last, active + 5),
      PageUp: Math.max(0, active - 5),
    };
    if (e.key in moves) {
      e.preventDefault();
      setActive(moves[e.key]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(active);
    } else if (e.key === "Escape") {
      // Only close the list — without this the surrounding <dialog> would close too.
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      close();
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        title={title}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKeyDown}
        className={
          buttonClassName
            ? `flex items-center gap-1 text-left disabled:opacity-60 ${buttonClassName}`
            : `${inputCls} flex items-center gap-2 text-left ${open ? "border-sky-500 ring-4 ring-sky-500/15" : ""}`
        }
      >
        <span className="min-w-0 flex-1 truncate">{options[selectedIdx]?.label}</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className={`shrink-0 transition-transform ${buttonClassName ? "size-3.5 opacity-70" : "size-[1.1rem] text-[#86868b]"} ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={id}
          style={place}
          className="z-50 w-max max-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-white p-1 text-sm shadow-lift ring-1 ring-black/[0.06]"
        >
          {options.map((o, i) => {
            const selected = i === selectedIdx;
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                onPointerMove={() => setActive(i)}
                onClick={() => pick(i)}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 ${
                  i === active ? "bg-sky-600/10" : ""
                } ${selected ? "font-medium text-sky-700" : "text-slate-700"}`}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {selected && <CheckIcon className="size-4 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
