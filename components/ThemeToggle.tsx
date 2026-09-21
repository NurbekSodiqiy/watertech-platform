"use client";

import { useEffect, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { Sun, Moon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { durations, easings, tween } from "@/lib/motion/tokens";
import { Pressable } from "@/components/motion/Pressable";

const THEME_KEY = "watertech-theme";

/** The icon of the option that has just become active turns in from -90° while
 * fading up. Only after the operator has clicked: the initial dark-mode sync in
 * the effect below is not a response to anything and stays still. */
function ThemeIcon({ Icon, turnIn }: { Icon: LucideIcon; turnIn: boolean }) {
  const reduce = useReducedMotion();
  return (
    <m.span
      className="flex shrink-0"
      initial={turnIn && !reduce ? { opacity: 0, rotate: -90 } : false}
      animate={{ opacity: 1, rotate: 0, transition: tween(durations.fast, easings.standard) }}
    >
      <Icon size={13} />
    </m.span>
  );
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const t = useTranslations("theme");

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function setTheme(dark: boolean) {
    setInteracted(true);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      // localStorage unavailable — theme choice just won't persist
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-surface-alt p-1">
      <Pressable
        onClick={() => setTheme(false)}
        aria-pressed={!isDark}
        className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium sm:px-2.5 ${
          !isDark ? "bg-surface text-primary-dark shadow-softer" : "text-text-secondary hover:text-primary-dark"
        }`}
      >
        <ThemeIcon key={isDark ? "off" : "on"} Icon={Sun} turnIn={interacted && !isDark} />
        <span className="hidden sm:inline">{t("light")}</span>
      </Pressable>
      <Pressable
        onClick={() => setTheme(true)}
        aria-pressed={isDark}
        className={`flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium sm:px-2.5 ${
          isDark ? "bg-surface text-primary-dark shadow-softer" : "text-text-secondary hover:text-primary-dark"
        }`}
      >
        <ThemeIcon key={isDark ? "on" : "off"} Icon={Moon} turnIn={interacted && isDark} />
        <span className="hidden sm:inline">{t("dark")}</span>
      </Pressable>
    </div>
  );
}
