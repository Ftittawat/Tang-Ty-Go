import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanEditor } from "@/components/plan-editor";
import { listTrips } from "@/lib/db";
import { getItems, getPlan } from "@/lib/plan-store";

export const dynamic = "force-dynamic";

async function load(props: PageProps<"/plans/[id]">) {
  const id = Number((await props.params).id);
  return Number.isInteger(id) ? getPlan(id) : undefined;
}

export async function generateMetadata(props: PageProps<"/plans/[id]">): Promise<Metadata> {
  const plan = await load(props);
  return { title: plan ? `${plan.title} · แผนเที่ยว` : "ไม่พบแผน" };
}

export default async function PlanPage(props: PageProps<"/plans/[id]">) {
  const plan = await load(props);
  if (!plan) notFound();
  return <PlanEditor plan={plan} items={getItems(plan.id)} trips={listTrips()} />;
}
