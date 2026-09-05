"use client";

import { useEffect, useRef, useState } from "react";
import { Compass, CreditCard, UserPlus, LogOut } from "lucide-react";

const menuItems = [
  { icon: Compass, label: "Explore Resources" },
  { icon: CreditCard, label: "Account Settings" },
  { icon: UserPlus, label: "Invite a Teammate" },
];

export function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-surface shadow-softer"
      >
        JD
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-border bg-surface p-2 shadow-soft">
          <div className="px-3 pb-2 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              Profile settings
            </p>
            <a href="#" className="mt-0.5 block text-[15px] font-bold text-primary-dark hover:text-primary">
              View profile
            </a>
          </div>

          <div className="my-1 border-t border-border" />

          <div className="py-1">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href="#"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-text-secondary hover:bg-primary/5 hover:text-primary-dark"
              >
                <item.icon size={15} />
                {item.label}
              </a>
            ))}
          </div>

          <div className="my-1 border-t border-border" />

          <a
            href="#"
            className="mt-1.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-status-outdated hover:bg-status-outdated/10"
          >
            <LogOut size={15} />
            Log out
          </a>
        </div>
      )}
    </div>
  );
}
