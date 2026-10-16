"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { XMarkIcon } from "@/components/icons";
import { closeBtn } from "@/components/ui";

const CloseContext = createContext<() => void>(() => {});

/** Closes the surrounding <Modal> through the dialog's own close path (fires onClose). */
export const useModalClose = () => useContext(CloseContext);

/** Native <dialog> shown as a modal. */
export function Modal({
  title, onClose, children, size = "max-w-xl",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && close()}
      className={`m-auto w-[calc(100%-2rem)] ${size} rounded-[28px] bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-transparent`}
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex items-center gap-2 border-b border-black/[0.06] px-5 py-3.5">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <button type="button" onClick={close} className={`${closeBtn} ml-auto`} aria-label="ปิด">
            <XMarkIcon className="size-4" />
          </button>
        </header>
        <CloseContext value={close}>{children}</CloseContext>
      </div>
    </dialog>
  );
}
