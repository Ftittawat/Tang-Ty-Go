import type { Metadata } from "next";
import { PlanList } from "@/components/plan-list";
import { listTrips } from "@/lib/db";
import { listPlans } from "@/lib/plan-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "แผนเที่ยว · Tang-Ty Go" };

export default function PlansPage() {
  return <PlanList plans={listPlans()} trips={listTrips()} />;
}
