import { NextResponse, type NextRequest } from "next/server";
import { canOpen } from "@/lib/access";
import { readSession, SESSION_COOKIE } from "@/lib/session";

/**
 * The app opens on the sign-in page: every page needs a session, and sessions end at 12 AM India time. Each role only
 * opens its own pages (lib/access.ts); anything else goes to Home. Runs before any page renders; the app layout checks
 * the session again.
 */
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const read = readSession(token);
  // Drivers no longer sign in; a session one still has from before ends here.
  const session = read && read.role !== "driver" ? read : null;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (pathname === "/login") {
    // An open app sends itself here at midnight; that always ends the session, even if this device's clock runs fast.
    if (searchParams.get("reason") === "midnight") return clearSession(NextResponse.next(), token);
    return session ? to("/") : NextResponse.next();
  }
  if (session) return canOpen(session.role, pathname) ? NextResponse.next() : to("/");

  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return clearSession(NextResponse.redirect(login), token);
}

function clearSession(response: NextResponse, token: string | undefined) {
  if (token) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  // Everything except build files, icons, the manifest, the service worker, robots/sitemap, the share image and the offline page.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|opengraph-image|offline|.*\\..*).*)",
  ],
};
