"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Pencil } from "lucide-react";

export function FeedbackWidget() {
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <div className="flex items-center gap-2 text-[13px] text-text-secondary">
        <span>Bu sahifa foydali bo'ldimi?</span>
        <button
          onClick={() => setVote("up")}
          className={`rounded-lg border border-border p-1.5 hover:bg-primary/5 ${
            vote === "up" ? "border-status-ok bg-status-ok/10 text-status-ok" : "text-text-secondary"
          }`}
          aria-label="Foydali"
        >
          <ThumbsUp size={14} />
        </button>
        <button
          onClick={() => setVote("down")}
          className={`rounded-lg border border-border p-1.5 hover:bg-primary/5 ${
            vote === "down"
              ? "border-status-outdated bg-status-outdated/10 text-status-outdated"
              : "text-text-secondary"
          }`}
          aria-label="Foydali emas"
        >
          <ThumbsDown size={14} />
        </button>
        {vote && <span className="text-[12px] italic text-text-secondary">Fikringiz uchun rahmat.</span>}
      </div>
      <button className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-[13px] font-medium text-primary-dark shadow-softer hover:bg-primary/5">
        <Pencil size={13} />
        Tahrir taklif qilish
      </button>
    </div>
  );
}
