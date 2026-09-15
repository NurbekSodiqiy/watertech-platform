import { unstable_setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { getFaqs } from "@/lib/content/loader";
import { changelogEntries } from "@/lib/mock-data/changelog";
import type { NavBadges } from "@/lib/types";

// changelogEntries.readCount is an "a / b" string — an entry is unread while
// a < b, matching the badge semantics NAV_BADGES used to hardcode.
function countUnreadChangelog(): number {
  return changelogEntries.filter((entry) => {
    const [read, total] = entry.readCount.split("/").map((n) => parseInt(n.trim(), 10));
    return read < total;
  }).length;
}

export default async function AppGroupLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale);
  const faqs = await getFaqs();
  const navBadges: NavBadges = {
    "/faq": { count: faqs.length, tone: "ok" },
    "/changelog": { count: countUnreadChangelog(), tone: "warning" },
  };

  return (
    <SessionProvider>
      <AppShell navBadges={navBadges}>{children}</AppShell>
    </SessionProvider>
  );
}
