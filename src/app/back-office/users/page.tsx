import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/app-nav";
import { UserActions } from "@/components/back-office";
import { Avatar, pillCls, surfaceCls } from "@/components/ui";
import { isSystemAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/back-office-store";
import { ownerPage } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ผู้ใช้ · หลังบ้าน · Tang-Ty Go" };

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

/** Owner only: every Google account that has signed in, with suspend / delete. */
export default async function UsersPage() {
  const me = await ownerPage();
  const users = listUsers();
  const banned = users.filter((u) => u.banned).length;

  return (
    <>
      <PageTitle title="ผู้ใช้" subtitle={`${users.length} บัญชี${banned ? ` · ระงับอยู่ ${banned}` : ""}`} />
      <ul className={`${surfaceCls} divide-y divide-black/[0.05] px-5`}>
        {users.map((u) => {
          const owner = isSystemAdmin(u.email);
          return (
            <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
              {u.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.image} alt="" referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-full" />
              ) : (
                <Avatar name={u.name} className="size-10" />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold">{u.name}</span>
                  {owner && <span className={`${pillCls} bg-[#ff9500]/12 py-0.5 text-[#c93400]`}>เจ้าของระบบ{u.id === me.userId ? " (คุณ)" : ""}</span>}
                  {u.banned && <span className={`${pillCls} bg-[#ff3b30]/10 py-0.5 text-[#d70015]`}>ระงับอยู่</span>}
                </p>
                <p className="truncate text-sm text-slate-500">{u.email}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  สมัคร {shortDate(u.created_at)}
                  {" · "}{u.last_seen ? `ใช้ล่าสุด ${shortDate(u.last_seen)}` : "ไม่มี session"}
                  {u.boards.length > 0 && (
                    <>
                      {" · "}
                      {u.boards.map((b, i) => (
                        <span key={b.id}>
                          {i > 0 && ", "}
                          <Link href={`/back-office/boards/${b.id}`} className="text-sky-600 hover:underline">{b.name}</Link>
                          <span className="text-slate-400"> ({b.member}{b.role === "admin" ? " · แอดมิน" : ""})</span>
                        </span>
                      ))}
                    </>
                  )}
                </p>
                {u.banned?.reason && <p className="mt-0.5 text-xs text-[#d70015]">เหตุผล: {u.banned.reason}</p>}
              </div>
              {!owner && <UserActions user={u} />}
            </li>
          );
        })}
      </ul>
    </>
  );
}
