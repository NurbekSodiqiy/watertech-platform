import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/ThemeScript";
import { TelemetryProvider } from "@/components/TelemetryProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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
        {children}
      </body>
    </html>
  );
}
