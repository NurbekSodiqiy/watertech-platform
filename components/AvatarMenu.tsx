"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// TODO: boshqa menyu bandlari (profilni ko'rish, hisob sozlamalari,
// hamkasbni taklif qilish) shu yerga qo'shilganda qaytariladi — hozircha
// faqat "Chiqish" ishlaydi, boshqalari real funksiyaga ega bo'lmagani
// sabab avval olib tashlangan edi.
export function AvatarMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const name = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email || "Foydalanuvchi";
      setUser({ name, email: u.email ?? "" });
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Foydalanuvchi menyusi"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-surface shadow-softer"
      >
        {user ? getInitials(user.name) : "?"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {user && (
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-[13px] font-semibold text-primary-dark">{user.name}</p>
              <p className="truncate text-[12px] text-text-secondary">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-primary-dark hover:bg-surface-alt"
          >
            <LogOut size={15} className="text-text-secondary" />
            Chiqish
          </button>
        </div>
      )}
    </div>
  );
}
