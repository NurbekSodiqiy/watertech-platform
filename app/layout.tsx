import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { ThemeScript } from "@/components/ThemeScript";

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
