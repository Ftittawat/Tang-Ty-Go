import type { Metadata } from "next";
import { BadmintonBoard } from "@/components/badminton-board";
import { MONTH_RE, monthGrid, todayTH } from "@/lib/badminton";
import { listBadmintonSessions, listMembers } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ตีแบด · Tang-Ty Go" };

/** Public page (no password, see proxy.ts): only badminton-tagged names are sent to the browser. */
export default async function BadmintonPage(props: PageProps<"/badminton">) {
  const today = todayTH();
  const m = (await props.searchParams).m;
  const month = typeof m === "string" && MONTH_RE.test(m) ? m : today.slice(0, 7);
  const days = monthGrid(month);
  const sessions = listBadmintonSessions(days[0], days[days.length - 1]);
  // Also anyone who signed up before losing the tag, so their name still shows on old sessions.
  const used = new Set(sessions.flatMap((s) => [s.organizer_id, ...s.player_ids]));
  const people = listMembers().filter((p) => p.tags.includes("badminton") || used.has(p.id));
  return <BadmintonBoard month={month} today={today} sessions={sessions} people={people} />;
}
