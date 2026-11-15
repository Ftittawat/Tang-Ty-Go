import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JoinForm, SwitchBoardButton } from "@/components/join-forms";
import { OnboardingShell } from "@/components/onboarding-shell";
import { primaryBtn } from "@/components/ui";
import { boardByCode, boardsForUser, listMembers, normalizeBoardCode } from "@/lib/db";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "เข้าร่วมบอร์ด · Tang-Ty Go" };

export default async function JoinBoardPage(props: PageProps<"/join/[code]">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const raw = decodeURIComponent((await props.params).code);
  const code = normalizeBoardCode(raw);
  if (code && code !== raw) redirect(`/join/${code}`);
  const board = code ? boardByCode(code) : undefined;

  if (!board) {
    return (
      <OnboardingShell title="ไม่พบบอร์ดนี้" subtitle="รหัสอาจผิด หรือแอดมินเปลี่ยนรหัสแล้ว — ขอรหัสใหม่จากแอดมิน" email={viewer.email}>
        <Link href="/join" className={`${primaryBtn} w-full py-2.5`}>ใส่รหัสอีกครั้ง</Link>
      </OnboardingShell>
    );
  }

  const mine = boardsForUser(viewer.userId).find((b) => b.id === board.id);
  if (mine) {
    return (
      <OnboardingShell title={board.name} subtitle={`คุณอยู่ในบอร์ดนี้แล้ว ในชื่อ “${mine.member_name}”`} email={viewer.email}>
        <SwitchBoardButton id={board.id} className={`${primaryBtn} w-full py-2.5`}>เข้าบอร์ด</SwitchBoardButton>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell title={`เข้าร่วม “${board.name}”`} subtitle="ตั้งชื่อเล่นที่เพื่อน ๆ ในแก๊งเรียกคุณ" email={viewer.email}>
      <JoinForm code={board.code} suggested={viewer.name.split(" ")[0]} unclaimed={listMembers(board.id).filter((m) => !m.linked)} />
      <Link href="/join" className="block text-center text-sm text-slate-500 hover:text-slate-900">← ใส่รหัสบอร์ดอื่น</Link>
    </OnboardingShell>
  );
}
