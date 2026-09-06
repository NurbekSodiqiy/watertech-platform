"use client";

import Link from "next/link";
import { Search, Menu, Bell, Bookmark } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { AvatarMenu } from "./AvatarMenu";

export function TopBar({
  onMenuClick,
  onOpenSearch,
  onOpenBookmarks,
}: {
  onMenuClick: () => void;
  onOpenSearch: () => void;
  onOpenBookmarks: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-1.5 text-primary-dark hover:bg-primary/10 lg:hidden"
        aria-label="Navigatsiyani ochish/yopish"
      >
        <Menu size={20} />
      </button>

      <Link href="/" className="flex shrink-0 items-center gap-2 lg:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-surface">
          WT
        </span>
        <span className="hidden text-sm font-semibold text-primary-dark sm:inline">
          Savdo bilimlar bazasi
        </span>
      </Link>

      <div className="relative min-w-0 flex-1 sm:max-w-[440px] sm:flex-none">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex w-full items-center rounded-xl border border-border bg-surface-alt py-2 pl-9 pr-2 text-left text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
        >
          <span className="min-w-0 flex-1 truncate">Bilimlar bazasidan qidirish…</span>
          <span className="ml-2 hidden shrink-0 items-center rounded-md border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium text-text-secondary sm:flex">
            Ctrl K
          </span>
        </button>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <ThemeToggle />

        <button
          onClick={onOpenBookmarks}
          aria-label="Saqlanganlar"
          title="Saqlanganlar"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-alt text-text-secondary shadow-softer hover:bg-primary/5 hover:text-primary-dark"
        >
          <Bookmark size={16} />
        </button>

        <button
          aria-label="Bildirishnomalar"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-alt text-text-secondary shadow-softer hover:bg-primary/5 hover:text-primary-dark"
        >
          <Bell size={16} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-status-outdated" />
        </button>

        <AvatarMenu />
      </div>
    </header>
  );
}
