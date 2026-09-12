"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useTrack } from "@/hooks/useTrack";

// TODO: "Tahrir taklif qilish" tugmasi tahrir-yuborish funksiyasi
// qo'shilganda qaytariladi — avvalgi versiyada bu tugma hech qanday
// backendga ulanmagan edi.
export function FeedbackWidget() {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const track = useTrack();

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <div className="flex items-center gap-2 text-[13px] text-text-secondary">
        <span>Bu sahifa foydali bo'ldimi?</span>
        <button
          onClick={() => {
            setVote("up");
            track("feedback", { meta: { helpful: true } });
          }}
          className={`rounded-lg border border-border p-1.5 hover:bg-primary/5 ${
            vote === "up" ? "border-status-ok bg-status-ok/10 text-status-ok" : "text-text-secondary"
          }`}
          aria-label="Foydali"
        >
          <ThumbsUp size={14} />
        </button>
        <button
          onClick={() => {
            setVote("down");
            track("feedback", { meta: { helpful: false } });
          }}
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
    </div>
  );
}
