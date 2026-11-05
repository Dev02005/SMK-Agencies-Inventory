import { getProfilePhoto } from "@/lib/data";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import type { NextRequest } from "next/server";

/**
 * A person's profile photo (Settings › Account), for anyone signed in. Links carry ?v={photoVersion}, so the browser
 * may keep it until the photo changes.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!readSession(request.cookies.get(SESSION_COOKIE)?.value)) return new Response(null, { status: 401 });
  const photo = await getProfilePhoto((await params).id);
  if (!photo) return new Response(null, { status: 404 });
  const bytes = Buffer.from(photo.slice(photo.indexOf(",") + 1), "base64");
  return new Response(bytes, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
