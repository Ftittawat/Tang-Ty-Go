import type { Metadata } from "next";
import { PlanList } from "@/components/plan-list";
import { listTrips } from "@/lib/db";
import { listPlans } from "@/lib/plan-store";
import { boardPage } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "แผนเที่ยว · Tang-Ty Go" };

export default async function PlansPage() {
  const { board } = await boardPage();
  return <PlanList plans={listPlans(board.id)} trips={listTrips(board.id)} />;
}
