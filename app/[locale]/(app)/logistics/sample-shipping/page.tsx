import { unstable_setRequestLocale } from "next-intl/server";
import { PageRenderer } from "@/components/PageRenderer";

export default function Page({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  return <PageRenderer path="/logistics/sample-shipping" />;
}
