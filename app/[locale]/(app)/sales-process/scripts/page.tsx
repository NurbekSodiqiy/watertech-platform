import { unstable_setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { getContentBundle } from "@/lib/content/loader";
import { ScriptsWorkspace } from "@/components/scripts/ScriptsWorkspace";
import type { Locale } from "@/i18n/routing";

export const metadata = {
  title: "Jonli skriptlar va Yordamchi",
};

export default async function ScriptsPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);

  const content = await getContentBundle(locale);
  return (
    <Suspense fallback={null}>
      <ScriptsWorkspace content={content} />
    </Suspense>
  );
}
