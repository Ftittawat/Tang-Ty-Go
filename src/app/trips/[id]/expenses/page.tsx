import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExpensesBoard } from "@/components/expenses-board";
import { FeatureOff } from "@/components/feature-off";
import { getTrip, listExpenses, listMembers, listSettled } from "@/lib/db";
import { boardPage, getBoardContext, getFeatures } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/trips/[id]/expenses">): Promise<Metadata> {
  const ctx = await getBoardContext();
  const trip = ctx ? getTrip(Number((await props.params).id), ctx.board.id) : null;
  return { title: `ค่าใช้จ่าย${trip ? ` · ${trip.title}` : ""} · Tang-Ty Go` };
}

export default async function ExpensesPage(props: PageProps<"/trips/[id]/expenses">) {
  const { board } = await boardPage();
  if (!(await getFeatures()).expenses) return <FeatureOff feature="expenses" />;
  const trip = getTrip(Number((await props.params).id), board.id);
  if (!trip) notFound();
  return (
    <ExpensesBoard
      trip={trip}
      members={listMembers(board.id)}
      expenses={listExpenses(trip.id)}
      settled={listSettled(trip.id)}
    />
  );
}
