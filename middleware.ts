import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Managers are confined to /dashboard, and /dashboard is confined to
  // managers — this is the one role check for both directions, so a
  // request already sitting on /dashboard doesn't skip it. API routes are
  // excluded so this never turns a fetch (e.g. telemetry) into a redirect
  // response instead of JSON.
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isApi = pathname.startsWith("/api/");
  if (user?.email && !isApi && !isPublicPath(pathname)) {
    const { data: allowedRow } = await supabase
      .from("allowed_users")
      .select("role")
      .eq("email", user.email)
      .maybeSingle();
    const isManager = allowedRow?.role === "manager";

    if (isManager !== isDashboard) {
      const url = request.nextUrl.clone();
      url.pathname = isManager ? "/dashboard" : "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
