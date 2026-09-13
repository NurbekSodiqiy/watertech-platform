import { createClient } from "@/lib/supabase/client";

interface RouterLike {
  push(href: string): void;
  refresh(): void;
}

/** Shared sign-out flow for every client sign-out button — keeps the
 * supabase.auth.signOut() + redirect + refresh sequence in one place. */
export async function signOutAndRedirect(router: RouterLike): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  router.push("/login");
  router.refresh();
}
