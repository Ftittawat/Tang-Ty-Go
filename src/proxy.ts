import { NextResponse, type NextRequest } from "next/server";
import { isSystemAdmin, sessionFromHeaders } from "@/lib/auth";
import { globalFeatures } from "@/lib/back-office-store";

const MAINTENANCE_PATH = "/maintenance";

/**
 * 1. Maintenance (switched on in /back-office): everyone but the owner gets the full-screen
 *    maintenance page for every URL. /login stays open (outside the matcher) so the owner can sign in.
 * 2. Otherwise any signed-in Google account gets past here; pages decide which board (if any) they can see.
 */
export async function proxy(request: NextRequest) {
  const session = await sessionFromHeaders(request.headers);
  const { pathname, search } = request.nextUrl;
  const owner = isSystemAdmin(session?.user.email);

  if (!owner && globalFeatures().maintenance) {
    // Server Actions still run so "ออกจากระบบ" works; anything that changes data is refused by writeBlocked().
    if (request.headers.has("next-action")) return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Maintenance" }, { status: 503, headers: { "Retry-After": "300" } });
    }
    if (pathname === MAINTENANCE_PATH) return NextResponse.next();
    return NextResponse.rewrite(new URL(MAINTENANCE_PATH, request.url), { status: 503, headers: { "Retry-After": "300" } });
  }
  // Nothing to show there when maintenance is off (the owner may still open it to preview).
  if (pathname === MAINTENANCE_PATH && !owner) return NextResponse.redirect(new URL("/", request.url));

  if (session) return NextResponse.next();
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
