import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeScript } from "@/components/ThemeScript";
import { TelemetryProvider } from "@/components/TelemetryProvider";
import { WebVitalsReporter } from "@/components/providers/WebVitalsReporter";

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WaterTech Savdo Bilimlar Bazasi",
  description: "WaterTech uchun ichki savdo bilimlar bazasi va wiki skeleti.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${inter.variable} font-sans text-primary-dark`}>
        <TelemetryProvider />
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  );
}
