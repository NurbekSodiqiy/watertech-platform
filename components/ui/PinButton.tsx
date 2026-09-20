"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { Pin, PinOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Pressable } from "@/components/motion/Pressable";
import { usePins } from "@/hooks/usePins";
import { useTrack } from "@/hooks/useTrack";
import type { PinKind } from "@/lib/user-state/keys";
import { isPinned } from "@/lib/user-state/pins";

/** Icon-only pin toggle for one piece of content. The accessible name stays
 * the same in both states — `aria-pressed` carries the state — while the
 * tooltip says what a click will do. Sits inside rows and cards that are
 * themselves clickable, so it swallows its own click and key events instead
 * of letting the parent open the item. */
export function PinButton({ kind, id, className = "" }: { kind: PinKind; id: string; className?: string }) {
  const t = useTranslations("common");
  const { pins, toggle, status } = usePins();
  const track = useTrack();
  const pinned = isPinned(pins, { kind, id });
  const Icon = pinned ? PinOff : Pin;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    toggle({ kind, id });
    track("pin_toggle", { entityType: kind, entityId: id, meta: { pinned: !pinned } });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  return (
    <Pressable
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      // Until the stored list has hydrated, a toggle would be applied to the
      // empty default and overwrite the real one.
      disabled={status === "loading"}
      aria-pressed={pinned}
      aria-label={t("pin")}
      title={pinned ? t("unpin") : t("pin")}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
        pinned ? "bg-primary/10 text-accent" : "text-text-secondary hover:bg-primary/10 hover:text-primary-dark"
      } ${className}`}
    >
      <Icon size={16} aria-hidden="true" />
    </Pressable>
  );
}
