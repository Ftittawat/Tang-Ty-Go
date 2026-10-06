import { Board } from "@/components/board";
import { listTrips } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function Home() {
  return <Board trips={listTrips()} />;
}
