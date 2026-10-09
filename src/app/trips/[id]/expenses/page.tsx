import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExpensesBoard } from "@/components/expenses-board";
import { getTrip, listExpenses, listMembers, listSettled } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/trips/[id]/expenses">): Promise<Metadata> {
  const trip = getTrip(Number((await props.params).id));
  return { title: `ค่าใช้จ่าย${trip ? ` · ${trip.title}` : ""} · Tang-Ty Go` };
}

export default async function ExpensesPage(props: PageProps<"/trips/[id]/expenses">) {
  const trip = getTrip(Number((await props.params).id));
  if (!trip) notFound();
  return (
    <ExpensesBoard
      trip={trip}
      members={listMembers()}
      expenses={listExpenses(trip.id)}
      settled={listSettled(trip.id)}
    />
  );
}
