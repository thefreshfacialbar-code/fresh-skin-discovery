import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSupabaseSession } from "@/lib/supabaseMiddleware";

export async function proxy(request: NextRequest) {
  const hostname = (
    request.headers.get("host") ?? request.nextUrl.hostname
  )
    .split(":")[0]
    .toLowerCase();

  if (
    hostname === "freshdesk.thefreshfacialbar.com" &&
    request.nextUrl.pathname === "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/fresh-desk";

    return NextResponse.redirect(url);
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/",
    "/fresh-desk/:path*",
    "/api/fresh-desk/:path*",
  ],
};