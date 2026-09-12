import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const email = data.user?.email;

    if (!error && email) {
      // Service-role client — the user's own session isn't trusted for this
      // check yet, since that's exactly what we're deciding here.
      const admin = createAdminClient();
      const { data: allowedRow } = await admin.from("allowed_users").select("email").eq("email", email).maybeSingle();

      if (allowedRow) {
        return NextResponse.redirect(`${origin}/`);
      }

      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=not_allowed`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=not_allowed`);
}
