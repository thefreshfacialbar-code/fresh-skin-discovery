import type { NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabaseMiddleware";

export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/fresh-desk/:path*",
    "/api/fresh-desk/:path*",
  ],
};