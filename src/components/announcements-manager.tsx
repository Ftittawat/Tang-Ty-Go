"use client";

import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import {
  deleteAnnouncement, resetAnnouncementDismissals, saveAnnouncement, setAnnouncementActive,
} from "@/app/back-office-actions";
import { AnnouncementCard } from "@/components/announcements";
import { Switch } from "@/components/back-office";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Modal, useModalClose } from "@/components/modal";
import { dangerBtn, ghostBtn, inputCls, labelCls, pillCls, primaryBtn, surfaceCls } from "@/components/ui";
import {
  ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX, announcementStatus, TONES, type AnnouncementAdmin, type Tone,
} from "@/lib/announcements";

const smallBtn = "px-2.5 py-1.5 text-xs";

const STATUS = {
  live: { label: "แสดงอยู่", cls: "bg-[#34c759]/12 text-[#248a3d]" },
  scheduled: { label: "ตั้งเวลาไว้", cls: "bg-sky-600/10 text-sky-700" },
  ended: { label: "หมดเวลาแล้ว", cls: "bg-black/[0.05] text-slate-500" },
  off: { label: "ปิดอยู่", cls: "bg-black/[0.05] text-slate-500" },
};

/** ISO (UTC) → the value a datetime-local input wants, in the browser's time zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value (browser's time zone) → ISO, so the server stores real UTC. */
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : "");

const when = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });

function AnnouncementForm({ editing }: { editing: AnnouncementAdmin | null }) {
  const close = useModalClose();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const [tone, setTone] = useState<Tone>(editing?.tone ?? "info");
  const [dismissible, setDismissible] = useState(editing?.dismissible ?? true);
  const [active, setActive] = useState(editing?.active ?? true);
  const [startsAt, setStartsAt] = useState(toLocalInput(editing?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(editing?.ends_at ?? null));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    start(async () => {
      const err = await saveAnnouncement({
        id: editing?.id,
        title,
        body,
        tone,
        dismissible,
        active,
        starts_at: fromLocalInput(startsAt),
        ends_at: fromLocalInput(endsAt),
      });
      setError(err);
      if (!err) close();
    });
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-col">
      <div className="space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <p className={labelCls}>ตัวอย่างที่ผู้ใช้จะเห็น</p>
          <div className="rounded-2xl bg-[#f5f5f7] p-3">
            <AnnouncementCard a={{ title, body: body.trim() || null, tone, dismissible }} />
          </div>
        </div>

        <div>
          <p className={labelCls}>ประเภท</p>
          <div role="radiogroup" aria-label="ประเภท" className="inline-flex rounded-full bg-black/[0.05] p-0.5 text-sm">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={tone === t.id}
                onClick={() => setTone(t.id)}
                className={`rounded-full px-3.5 py-1.5 font-medium transition ${
                  tone === t.id ? "bg-white text-slate-900 shadow-[0_1px_3px_rgb(0_0_0/0.1)]" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="ann-title" className={labelCls}>หัวข้อ</label>
          <input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={ANNOUNCEMENT_TITLE_MAX} autoFocus className={inputCls} />
        </div>
        <div>
          <label htmlFor="ann-body" className={labelCls}>รายละเอียด (ไม่บังคับ)</label>
          <textarea id="ann-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={ANNOUNCEMENT_BODY_MAX} rows={3} className={`${inputCls} resize-y`} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ann-start" className={labelCls}>เริ่มแสดง (เว้นว่าง = ทันที)</label>
            <input id="ann-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="ann-end" className={labelCls}>หยุดแสดง (เว้นว่าง = ไม่มีกำหนด)</label>
            <input id="ann-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="divide-y divide-black/[0.05] rounded-2xl ring-1 ring-black/[0.06]">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 text-sm">
              <p className="font-medium">ให้ผู้ใช้กดปิดได้</p>
              <p className="text-xs text-slate-500">กด ✕ แล้วประกาศนี้จะไม่แสดงกับคนนั้นอีก</p>
            </div>
            <Switch on={dismissible} onChange={setDismissible} label="ให้ผู้ใช้กดปิดได้" />
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 text-sm">
              <p className="font-medium">เปิดใช้งาน</p>
              <p className="text-xs text-slate-500">ปิดไว้ก่อนได้ ถ้ายังไม่อยากให้ใครเห็น</p>
            </div>
            <Switch on={active} onChange={setActive} label="เปิดใช้งาน" />
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-black/[0.06] px-5 py-3.5">
        <button type="button" onClick={close} className={ghostBtn}>ยกเลิก</button>
        <button disabled={pending} className={primaryBtn}>{pending ? "กำลังบันทึก…" : editing ? "บันทึก" : "ประกาศ"}</button>
      </div>
    </form>
  );
}

function DeleteConfirm({ a }: { a: AnnouncementAdmin }) {
  const close = useModalClose();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4 px-5 py-4">
      <p className="text-sm text-slate-600">
        ประกาศ <span className="font-semibold text-slate-900">“{a.title}”</span> จะหายจากหน้าแอปของทุกคน และกู้คืนไม่ได้
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={close} className={ghostBtn}>ยกเลิก</button>
        <button
          disabled={pending}
          onClick={() => start(async () => { await deleteAnnouncement(a.id); close(); })}
          className={`${dangerBtn} bg-[#ff3b30] text-white hover:bg-[#d70015]`}
        >
          <TrashIcon className="size-4" />{pending ? "กำลังลบ…" : "ลบประกาศ"}
        </button>
      </div>
    </div>
  );
}

function Row({ a, onEdit, onDelete }: { a: AnnouncementAdmin; onEdit: () => void; onDelete: () => void }) {
  const [active, setActive] = useOptimistic(a.active);
  const [pending, start] = useTransition();
  const status = STATUS[announcementStatus({ ...a, active })];
  const tone = TONES.find((t) => t.id === a.tone)!;

  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-2 py-4">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className={`${pillCls} py-0.5 ${status.cls}`}>{status.label}</span>
          <span className={`${pillCls} bg-black/[0.05] py-0.5 text-slate-600`}>{tone.label}</span>
        </p>
        <p className="mt-1.5 font-semibold wrap-break-word">{a.title}</p>
        {a.body && <p className="line-clamp-2 whitespace-pre-line text-sm text-slate-500">{a.body}</p>}
        <p className="mt-1 text-xs text-slate-500">
          {a.starts_at ? `เริ่ม ${when(a.starts_at)}` : `สร้าง ${when(a.created_at)}`}
          {a.ends_at && ` · ถึง ${when(a.ends_at)}`}
          {a.dismissible ? (
            <>
              {" · "}ปิดไปแล้ว {a.dismissed_count} คน
              {a.dismissed_count > 0 && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => start(() => resetAnnouncementDismissals(a.id))}
                  className="ml-1 font-medium text-sky-600 hover:underline disabled:opacity-60"
                >
                  แสดงให้คนที่ปิดไปเห็นอีกครั้ง
                </button>
              )}
            </>
          ) : " · ผู้ใช้ปิดเองไม่ได้"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          on={active}
          disabled={pending}
          label={`เปิดใช้งาน ${a.title}`}
          onChange={(next) => start(async () => { setActive(next); await setAnnouncementActive(a.id, next); })}
        />
        <button onClick={onEdit} className={`${ghostBtn} ${smallBtn}`}><PencilIcon className="size-3.5" />แก้ไข</button>
        <button onClick={onDelete} className={`${dangerBtn} ${smallBtn}`} aria-label={`ลบ ${a.title}`}><TrashIcon className="size-3.5" /></button>
      </div>
    </li>
  );
}

/** Owner's list of announcements with create / edit / on-off / delete. */
export function AnnouncementsManager({ items }: { items: AnnouncementAdmin[] }) {
  const [editing, setEditing] = useState<AnnouncementAdmin | "new" | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementAdmin | null>(null);

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setEditing("new")} className={primaryBtn}><PlusIcon className="size-4" />สร้างประกาศ</button>
      </div>

      {items.length === 0 ? (
        <p className={`${surfaceCls} px-4 py-10 text-center text-sm text-slate-400`}>
          ยังไม่มีประกาศ ประกาศที่สร้างจะขึ้นใต้แถบเมนูของทุกคนที่เข้าสู่ระบบ
        </p>
      ) : (
        <ul className={`${surfaceCls} divide-y divide-black/[0.05] px-5`}>
          {items.map((a) => (
            <Row key={a.id} a={a} onEdit={() => setEditing(a)} onDelete={() => setDeleting(a)} />
          ))}
        </ul>
      )}

      {editing && (
        <Modal title={editing === "new" ? "สร้างประกาศ" : "แก้ไขประกาศ"} onClose={() => setEditing(null)} size="max-w-lg">
          <AnnouncementForm editing={editing === "new" ? null : editing} />
        </Modal>
      )}
      {deleting && (
        <Modal title="ลบประกาศ" onClose={() => setDeleting(null)} size="max-w-md">
          <DeleteConfirm a={deleting} />
        </Modal>
      )}
    </>
  );
}
