import type { Metadata } from "next";
import { FeatureOff } from "@/components/feature-off";
import { PlanList } from "@/components/plan-list";
import { listTrips } from "@/lib/db";
import { listPlans } from "@/lib/plan-store";
import { boardPage, getFeatures } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "แผนเที่ยว · Tang-Ty Go" };

export default async function PlansPage() {
  const { board } = await boardPage();
  if (!(await getFeatures()).plans) return <FeatureOff feature="plans" />;
  return <PlanList plans={listPlans(board.id)} trips={listTrips(board.id)} />;
}
