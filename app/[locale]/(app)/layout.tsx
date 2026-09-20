import { unstable_setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { OfflineBanner } from "@/components/providers/OfflineBanner";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { getChangelog, getFaqs } from "@/lib/content/loader";
import type { NavBadges } from "@/lib/types";
import type { Locale } from "@/i18n/routing";

export default async function AppGroupLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  unstable_setRequestLocale(locale);
  const [faqs, changelog] = await Promise.all([getFaqs(locale), getChangelog(locale)]);
  const navBadges: NavBadges = {
    "/faq": { count: faqs.length, tone: "ok" },
  };
  // The /changelog badge is per operator (entries minus the ones they have
  // read), which a layout that must stay static — no cookies()/headers(), see
  // CLAUDE.md section 3 — cannot know. It only passes the published ids; AppShell
  // derives the count on the client from `changelog.read`.
  const changelogIds = changelog.map((entry) => entry.id);

  return (
    <SessionProvider>
      {/* Above the shell rather than inside it: the banner is a statement
          about the whole app, and it renders nothing at all while online. */}
      <OfflineBanner />
      <AppShell navBadges={navBadges} changelogIds={changelogIds}>
        {children}
      </AppShell>
    </SessionProvider>
  );
}
