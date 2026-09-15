"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { TopBar } from "./TopBar";
import { Sidebar, SidebarNav } from "./Sidebar";
import { PageTransition } from "./PageTransition";
import type { NavBadges } from "@/lib/types";

const CommandPalette = dynamic(() => import("./CommandPalette").then((m) => m.CommandPalette), {
  ssr: false,
});

export function AppShell({ children, navBadges }: { children: React.ReactNode; navBadges?: NavBadges }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [paletteEverOpened, setPaletteEverOpened] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const t = useTranslations("chrome.appShell");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (commandOpen) setPaletteEverOpened(true);
  }, [commandOpen]);

  useEffect(() => {
    // warms the chunk after the page is idle so Ctrl+K opens instantly
    const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => setTimeout(cb, 1500));
    const id = idle(() => {
      void import("./CommandPalette");
    });
    return () => (window.cancelIdleCallback ?? clearTimeout)(id as never);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar navBadges={navBadges} />

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <motion.div
              className="absolute inset-0 bg-primary-dark/30"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.15 }}
            />
            <motion.div
              className="relative flex h-full w-72 max-w-[85vw] flex-col bg-surface shadow-soft"
              initial={reduce ? undefined : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: "-100%" }}
              transition={{ duration: reduce ? 0 : 0.18, ease: "easeOut" }}
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-3">
                <span className="text-sm font-semibold text-primary-dark">{t("mobileNavTitle")}</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-1 text-text-secondary hover:bg-primary/10"
                  aria-label={t("closeMobileNav")}
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarNav scope="mobile" navBadges={navBadges} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onMenuClick={() => setMobileOpen(true)}
          onOpenSearch={() => setCommandOpen(true)}
        />
        <main className="min-w-0 flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {paletteEverOpened && (
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      )}
    </div>
  );
}
