import { NextResponse } from "next/server";
import { announcementsFor } from "@/lib/back-office-store";
import { getViewer } from "@/lib/viewer";

/**
 * The signed-in user's live announcements. The bar re-reads this on navigation and when the tab
 * comes back into view, since the root layout (which renders the first batch) doesn't re-render then.
 */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(announcementsFor(viewer.userId), { headers: { "Cache-Control": "no-store" } });
}
