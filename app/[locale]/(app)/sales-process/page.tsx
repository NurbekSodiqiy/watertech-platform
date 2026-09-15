import { unstable_setRequestLocale } from "next-intl/server";
import { SectionLanding } from "@/components/SectionLanding";
import { findNode } from "@/lib/site-config";

export default function Page({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  return <SectionLanding node={findNode("/sales-process")!} />;
}
