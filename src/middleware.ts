import { NextResponse, type NextRequest } from "next/server";

// Lightweight route guard. When Supabase is configured this is where you would
// refresh the session and read the user's role to protect /dashboard and
// /admin. Without Supabase env vars we let everything through so the demo UI
// is fully browsable.
const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!SUPABASE_CONFIGURED) {
    return response;
  }

  // When configured, integrate @supabase/ssr session refresh here and redirect
  // unauthenticated users away from protected routes:
  //
  //   const supabase = createServerClient(...);
  //   const { data: { user } } = await supabase.auth.getUser();
  //   if (!user && request.nextUrl.pathname.startsWith("/dashboard")) { ... }
  //
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/exam/:path*"],
};
