"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

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
      className={`m-auto w-[calc(100%-2rem)] ${size} rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-transparent`}
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={close} className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="ปิด">
            ✕
          </button>
        </header>
        <CloseContext value={close}>{children}</CloseContext>
      </div>
    </dialog>
  );
}
