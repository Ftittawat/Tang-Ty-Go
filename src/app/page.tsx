import { Board } from "@/components/board";
import { listMembers, listTrips } from "@/lib/db";
import { boardPage } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function Home(props: PageProps<"/">) {
  const { board } = await boardPage();
  const trip = Number((await props.searchParams).trip) || undefined;
  return <Board trips={listTrips(board.id)} members={listMembers(board.id)} initialTripId={trip} />;
}
