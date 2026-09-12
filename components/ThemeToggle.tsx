"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const THEME_KEY = "watertech-theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function setTheme(dark: boolean) {
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
      <button
        onClick={() => setTheme(false)}
        aria-pressed={!isDark}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium ${
          !isDark ? "bg-surface text-primary-dark shadow-softer" : "text-text-secondary hover:text-primary-dark"
        }`}
      >
        <Sun size={13} />
        <span className="hidden sm:inline">Yorug&apos;</span>
      </button>
      <button
        onClick={() => setTheme(true)}
        aria-pressed={isDark}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium ${
          isDark ? "bg-surface text-primary-dark shadow-softer" : "text-text-secondary hover:text-primary-dark"
        }`}
      >
        <Moon size={13} />
        <span className="hidden sm:inline">Qorong&apos;i</span>
      </button>
    </div>
  );
}
