import { NextResponse, type NextRequest } from "next/server";
import { sessionFromHeaders } from "@/lib/auth";

/** Any signed-in Google account gets past here; pages decide which board (if any) they can see. */
export async function proxy(request: NextRequest) {
  if (await sessionFromHeaders(request.headers)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL("/login", request.url);
  // Come back here after Google (e.g. an invite link /join/K7QM-3XPA, or /?trip=12 from a calendar event).
  if (pathname !== "/" || search) url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // Public: login page, Better Auth's own endpoints (/api/auth/*), static assets and icons.
  matcher: ["/((?!login|api/auth|_next/static|_next/image|.*\\.(?:ico|png|svg|webmanifest)$).*)"],
};
