import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session";

const SET_PASSWORD = "/login/new-password";

/**
 * The app opens on the sign-in page: every page needs a session, and sessions end at 12 AM India time.
 * Someone who signed in with their starting password (their mobile number) sees only the page to set their own.
 * Runs before any page renders; the app layout checks the session again.
 */
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = readSession(token);
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (pathname === "/login") {
    // An open app sends itself here at midnight; that always ends the session, even if this device's clock runs fast.
    if (searchParams.get("reason") === "midnight") return clearSession(NextResponse.next(), token);
    return session ? to("/") : NextResponse.next();
  }
  if (pathname === SET_PASSWORD) {
    if (!session) return clearSession(to("/login"), token);
    return session.mustChange ? NextResponse.next() : to("/");
  }
  if (session?.mustChange) return to(`${SET_PASSWORD}${pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`}`);
  if (session) return NextResponse.next();

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
