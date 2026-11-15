import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanEditor } from "@/components/plan-editor";
import { listTrips } from "@/lib/db";
import { getItems, getPlan } from "@/lib/plan-store";
import { boardPage, getBoardContext } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/plans/[id]">): Promise<Metadata> {
  const ctx = await getBoardContext();
  const plan = ctx ? getPlan(Number((await props.params).id), ctx.board.id) : undefined;
  return { title: plan ? `${plan.title} · แผนเที่ยว` : "ไม่พบแผน" };
}

export default async function PlanPage(props: PageProps<"/plans/[id]">) {
  const { board } = await boardPage();
  const plan = getPlan(Number((await props.params).id), board.id);
  if (!plan) notFound();
  return <PlanEditor plan={plan} items={getItems(plan.id)} trips={listTrips(board.id)} />;
}
