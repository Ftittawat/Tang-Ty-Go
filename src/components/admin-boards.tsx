"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { deleteBoard } from "@/app/board-actions";
import { ExclamationIcon, TrashIcon } from "@/components/icons";
import { SwitchBoardButton } from "@/components/join-forms";
import { Modal, useModalClose } from "@/components/modal";
import { dangerBtn, ghostBtn, inputCls, labelCls, pillCls, surfaceCls } from "@/components/ui";
import type { BoardSummary } from "@/lib/db";

const smallBtn = "px-2.5 py-1.5 text-xs";

function DeleteForm({ board }: { board: BoardSummary }) {
  const close = useModalClose();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const matches = typed.trim() === board.name;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!matches) return;
    start(async () => {
      const err = await deleteBoard(board.id, typed);
      setError(err);
      if (!err) close();
    });
  };

  const lost = [
    `${board.trip_count} ทริป (รวมค่าใช้จ่าย / บิลทั้งหมด)`,
    `${board.plan_count} แผนเที่ยว`,
    `รายชื่อ ${board.member_count} คน — คนที่เข้าร่วมแล้ว ${board.joined_count} คนจะไม่เห็นบอร์ดนี้อีก`,
  ];

  return (
    <form onSubmit={submit} className="space-y-4 px-5 py-4">
      <div className="flex gap-3 rounded-2xl bg-[#ff3b30]/8 p-3.5 text-sm text-[#d70015]">
        <ExclamationIcon className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">ลบแล้วกู้คืนไม่ได้ ข้อมูลเหล่านี้จะหายทั้งหมด:</p>
          <ul className="mt-1 list-disc pl-4">
            {lost.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      </div>
      <div>
        <label htmlFor="confirm-board-name" className={labelCls}>
          พิมพ์ชื่อบอร์ด <span className="font-semibold text-slate-900">{board.name}</span> เพื่อยืนยัน
        </label>
        <input
          id="confirm-board-name"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoFocus
          className={inputCls}
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={close} className={ghostBtn}>ยกเลิก</button>
        <button disabled={!matches || pending} className={`${dangerBtn} bg-[#ff3b30] text-white hover:bg-[#d70015] disabled:opacity-40`}>
          <TrashIcon className="size-4" />
          {pending ? "กำลังลบ…" : "ลบบอร์ดถาวร"}
        </button>
      </div>
    </form>
  );
}

/** System admins' list of every board, with open / join and delete. */
export function AdminBoards({
  boards, myBoardIds, currentBoardId,
}: {
  boards: BoardSummary[];
  myBoardIds: number[];
  currentBoardId: number | null;
}) {
  const [deleting, setDeleting] = useState<BoardSummary | null>(null);

  if (boards.length === 0) {
    return (
      <p className={`${surfaceCls} px-4 py-10 text-center text-sm text-slate-400`}>
        ยังไม่มีบอร์ด — สร้างบอร์ดแรกได้ที่หน้า <Link href="/join" className="text-sky-600 hover:underline">เข้าร่วม / สร้างบอร์ด</Link>
      </p>
    );
  }

  return (
    <>
      <ul className={`${surfaceCls} divide-y divide-black/[0.05] px-5`}>
        {boards.map((b) => {
          const mine = myBoardIds.includes(b.id);
          return (
            <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold">{b.name}</span>
                  {b.id === currentBoardId ? (
                    <span className={`${pillCls} bg-[#34c759]/12 py-0.5 text-[#248a3d]`}>เปิดอยู่</span>
                  ) : mine && (
                    <span className={`${pillCls} bg-black/[0.05] py-0.5 text-slate-500`}>คุณอยู่ในบอร์ดนี้</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  <span className="font-mono">{b.code}</span>
                  {" · "}{b.joined_count}/{b.member_count} คนเข้าร่วม · {b.trip_count} ทริป · {b.plan_count} แผน
                  {" · "}สร้าง {new Date(b.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {mine ? (
                  b.id !== currentBoardId && <SwitchBoardButton id={b.id} className={`${ghostBtn} ${smallBtn}`}>เปิดบอร์ด</SwitchBoardButton>
                ) : (
                  <Link href={`/join/${b.code}`} className={`${ghostBtn} ${smallBtn}`}>เข้าร่วม</Link>
                )}
                <button onClick={() => setDeleting(b)} className={`${dangerBtn} ${smallBtn}`}>
                  <TrashIcon className="size-3.5" />ลบ
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {deleting && (
        <Modal title={`ลบบอร์ด “${deleting.name}”`} onClose={() => setDeleting(null)} size="max-w-md">
          <DeleteForm board={deleting} />
        </Modal>
      )}
    </>
  );
}
