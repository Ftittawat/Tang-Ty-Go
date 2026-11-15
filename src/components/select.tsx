"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CheckIcon } from "@/components/icons";
import { inputCls } from "@/components/ui";

export type SelectOption = { value: string; label: string };

/**
 * Dropdown that opens right under the field. Replaces <select> where the native macOS menu
 * (which pops up over the field, hiding the label) looks off. Submits through a hidden input,
 * so it drops into a <form> like a select with `name` + `defaultValue`.
 */
export function Select({
  id, name, options, defaultValue, onChange, "aria-label": ariaLabel, className = "",
}: {
  id?: string;
  name: string;
  options: SelectOption[];
  defaultValue: string;
  onChange?: (value: string) => void;
  "aria-label"?: string;
  className?: string;
}) {
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedIdx = Math.max(0, options.findIndex((o) => o.value === value));

  const show = () => {
    setActive(selectedIdx);
    setOpen(true);
  };
  const pick = (i: number) => {
    const v = options[i]?.value;
    if (v === undefined) return;
    setValue(v);
    setOpen(false);
    onChange?.(v);
  };

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

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
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input type="hidden" name={name} value={value} />
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={`${inputCls} flex items-center gap-2 text-left ${open ? "border-sky-500 ring-4 ring-sky-500/15" : ""}`}
      >
        <span className="min-w-0 flex-1 truncate">{options[selectedIdx]?.label}</span>
        <svg viewBox="0 0 20 20" aria-hidden className={`size-[1.1rem] shrink-0 text-[#86868b] transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-64 overflow-y-auto rounded-2xl bg-white p-1 text-sm shadow-lift ring-1 ring-black/[0.06]"
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
