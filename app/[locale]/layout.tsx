import type { Metadata } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { ThemeScript } from "@/components/ThemeScript";
import { TelemetryProvider } from "@/components/TelemetryProvider";
import { WebVitalsReporter } from "@/components/providers/WebVitalsReporter";
import { Toaster } from "@/components/ui/Toaster";
import { routing } from "@/i18n/routing";
import "../globals.css";

const inter = localFont({
  src: "../fonts/InterVariable.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();

  unstable_setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${inter.variable} font-sans text-primary-dark`}>
        <NextIntlClientProvider messages={messages}>
          <TelemetryProvider />
          <WebVitalsReporter />
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
