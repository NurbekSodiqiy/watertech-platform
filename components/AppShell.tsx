"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { TopBar } from "./TopBar";
import { Sidebar, SidebarNav } from "./Sidebar";
import { PageTransition } from "./PageTransition";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { WidgetFallback } from "@/components/ui/WidgetFallback";
import { CopilotButton } from "@/components/copilot/CopilotButton";
import type { CopilotPrefill } from "@/components/copilot/CopilotPanel";
import type { NavBadges } from "@/lib/types";
import { scheduleIdle } from "@/lib/idle";
import { durations, easings } from "@/lib/motion/tokens";

const CommandPalette = dynamic(() => import("./CommandPalette").then((m) => m.CommandPalette), {
  ssr: false,
});

const CopilotPanel = dynamic(() => import("@/components/copilot/CopilotPanel").then((m) => m.CopilotPanel), {
  ssr: false,
});

const ShortcutsHelp = dynamic(() => import("@/components/layout/ShortcutsHelp").then((m) => m.ShortcutsHelp), {
  ssr: false,
});

export function AppShell({ children, navBadges }: { children: React.ReactNode; navBadges?: NavBadges }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [paletteEverOpened, setPaletteEverOpened] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shortcutsEverOpened, setShortcutsEverOpened] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotEverOpened, setCopilotEverOpened] = useState(false);
  const [copilotPrefill, setCopilotPrefill] = useState<CopilotPrefill | null>(null);
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
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setCopilotOpen((open) => !open);
        return;
      }
      // "?" is a printable character, so it only opens help when the operator
      // isn't typing it into something (the client-name field, the palette's
      // own input, an admin form).
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement | null;
        const isTyping =
          !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
        if (isTyping) return;
        e.preventDefault();
        setShortcutsOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (commandOpen) setPaletteEverOpened(true);
  }, [commandOpen]);

  useEffect(() => {
    if (shortcutsOpen) setShortcutsEverOpened(true);
  }, [shortcutsOpen]);

  useEffect(() => {
    if (copilotOpen) setCopilotEverOpened(true);
  }, [copilotOpen]);

  const closeCopilot = useCallback(() => setCopilotOpen(false), []);

  const askCopilot = useCallback((query: string) => {
    setCommandOpen(false);
    setCopilotPrefill((prev) => ({ text: query, key: (prev?.key ?? 0) + 1 }));
    setCopilotOpen(true);
  }, []);

  useEffect(() => {
    // warms the chunk after the page is idle so Ctrl+K opens instantly
    return scheduleIdle(() => {
      void import("./CommandPalette");
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar navBadges={navBadges} />

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <m.div
              className="absolute inset-0 bg-primary-dark/30"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : durations.instant }}
            />
            <m.div
              className="relative flex h-full w-72 max-w-[85vw] flex-col bg-surface shadow-soft"
              initial={reduce ? undefined : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: "-100%" }}
              transition={{ duration: reduce ? 0 : durations.fast, ease: easings.standard }}
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
            </m.div>
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
        // A crashed palette (or a failed chunk load) shows the retry card in
        // the palette's own dialog slot instead of taking down the shell.
        <ErrorBoundary
          fallback={(reset) => (
            <Dialog
              open={commandOpen}
              onClose={() => setCommandOpen(false)}
              labelledBy="command-palette-fallback"
              containerClassName="z-50 flex items-start justify-center px-4 pt-[12vh]"
              panelClassName="w-full max-w-xl"
            >
              <WidgetFallback reset={reset} titleId="command-palette-fallback" />
            </Dialog>
          )}
        >
          <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onAskCopilot={askCopilot} />
        </ErrorBoundary>
      )}

      <CopilotButton open={copilotOpen} onToggle={() => setCopilotOpen((open) => !open)} />

      {copilotEverOpened && (
        // Kept mounted once opened: the session's conversation lives inside.
        <ErrorBoundary
          fallback={(reset) => (
            <Dialog
              open={copilotOpen}
              onClose={closeCopilot}
              labelledBy="copilot-panel-fallback"
              containerClassName="z-50 flex items-start justify-center px-4 pt-[12vh]"
              panelClassName="w-full max-w-xl"
            >
              <WidgetFallback reset={reset} titleId="copilot-panel-fallback" />
            </Dialog>
          )}
        >
          <CopilotPanel open={copilotOpen} onClose={closeCopilot} prefill={copilotPrefill} />
        </ErrorBoundary>
      )}

      {shortcutsEverOpened && (
        <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      )}
    </div>
  );
}
