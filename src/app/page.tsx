import { Board } from "@/components/board";
import { listMembers, listTrips } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home(props: PageProps<"/">) {
  const trip = Number((await props.searchParams).trip) || undefined;
  return <Board trips={listTrips()} members={listMembers()} initialTripId={trip} />;
}
