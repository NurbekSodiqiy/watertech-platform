import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    console.warn("[auth/callback] no ?code in the request — nothing to exchange");
    return NextResponse.redirect(`${origin}/login?error=not_allowed`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Redirecting to the same ?error=not_allowed as the allow-list check
    // below is deliberate (don't reveal *why* to the client), but that
    // means this branch — the code/PKCE exchange itself failing, unrelated
    // to the allow-list — would otherwise look identical from the browser.
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=not_allowed`);
  }

  const email = data.user?.email;
  if (!email) {
    console.error("[auth/callback] session has no email on user:", data.user?.id);
    return NextResponse.redirect(`${origin}/login?error=not_allowed`);
  }

  // Service-role client — the user's own session isn't trusted for this
  // check yet, since that's exactly what we're deciding here.
  const admin = createAdminClient();
  const { data: allowedRow, error: allowedError } = await admin
    .from("allowed_users")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (allowedError) {
    console.error("[auth/callback] allow-list query failed:", allowedError.message);
  } else {
    console.log(`[auth/callback] ${email}: ${allowedRow ? "allowed" : "not on allow-list"}`);
  }

  if (allowedRow) {
    return NextResponse.redirect(`${origin}/`);
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/login?error=not_allowed`);
}
