"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "@/hooks/useToast";
import { useTrack } from "@/hooks/useTrack";
import { answerForClipboard, parseCopilotStream, type CopilotSource } from "@/lib/copilot/protocol";
import type { CopilotHistoryTurn } from "@/lib/copilot/schema";

export type CopilotErrorKind = "disabled" | "unavailable" | "interrupted" | "invalid" | "unauthorized" | "rateLimited";

export type CopilotMessageData =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      sources: CopilotSource[];
      status: "streaming" | "done" | "error";
      error?: CopilotErrorKind;
    };

type AssistantMessage = Extract<CopilotMessageData, { role: "assistant" }>;

const MAX_HISTORY_TURNS = 6;
const MAX_HISTORY_CHARS = 1500;

/** Session-only Copilot conversation: lives in component state, gone on
 * reload. `ask` streams the answer from /api/copilot into the last assistant
 * message as it arrives; `cancel` aborts an in-flight answer. */
export function useCopilot() {
  const [messages, setMessages] = useState<CopilotMessageData[]>([]);
  const [pending, setPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(0);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const locale = useLocale();
  const t = useTranslations("copilot");
  const { toast } = useToast();
  const track = useTrack();

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const ask = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || abortRef.current) return;

      // Only finished exchanges become history — a failed or cut-off answer
      // would just teach the model its own broken output. Citations are
      // stripped: their [n] pointed at the previous turn's CONTEXT blocks.
      const history: CopilotHistoryTurn[] = [];
      for (const [i, m] of messagesRef.current.entries()) {
        if (m.role !== "user") continue;
        const reply = messagesRef.current[i + 1];
        if (!reply || reply.role !== "assistant" || reply.status !== "done") continue;
        history.push(
          { role: "user", content: m.content.slice(0, MAX_HISTORY_CHARS) },
          { role: "assistant", content: answerForClipboard(reply.content).slice(0, MAX_HISTORY_CHARS) }
        );
      }

      const userId = `m${++nextId.current}`;
      const assistantId = `m${++nextId.current}`;
      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", content: question },
        { id: assistantId, role: "assistant", content: "", sources: [], status: "streaming" },
      ]);

      const patch = (update: Partial<AssistantMessage>) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId && m.role === "assistant" ? { ...m, ...update } : m))
        );

      const controller = new AbortController();
      abortRef.current = controller;
      setPending(true);

      try {
        const res = await fetch("/api/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, locale, history: history.slice(-MAX_HISTORY_TURNS) }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let code = "";
          try {
            const body: unknown = await res.json();
            if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
              code = body.error;
            }
          } catch {
            // non-JSON error body
          }

          let error: CopilotErrorKind = "unavailable";
          if (res.status === 401) {
            error = "unauthorized";
            toast({
              kind: "error",
              title: t("errors.unauthorized"),
              description: t("toast.unauthorizedHint"),
              action: { label: t("toast.reload"), onClick: () => window.location.reload() },
            });
          } else if (res.status === 429) {
            error = "rateLimited";
            const seconds = Number(res.headers.get("Retry-After")) || 60;
            toast({ kind: "error", title: t("errors.rateLimited"), description: t("toast.rateLimitedHint", { seconds }) });
          } else if (res.status === 503 && code === "copilot_disabled") {
            error = "disabled";
          } else if (res.status === 400 || res.status === 413) {
            error = "invalid";
          }
          patch({ status: "error", error });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let raw = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
          patch({ content: parseCopilotStream(raw).answer });
        }
        raw += decoder.decode();

        const parsed = parseCopilotStream(raw);
        if (parsed.failed || !parsed.complete) {
          patch({ content: parsed.answer, status: "error", error: "interrupted" });
          return;
        }
        patch({ content: parsed.answer, sources: parsed.sources, status: "done" });
        // Counts only — never the question (telemetry is operator-visible).
        track("copilot_ask", { meta: { hits: parsed.sources.length, chars: parsed.answer.length } });
      } catch {
        patch({ status: "error", error: "interrupted" });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setPending(false);
      }
    },
    [locale, t, toast, track]
  );

  const clear = useCallback(() => {
    cancel();
    setMessages([]);
  }, [cancel]);

  return { messages, pending, ask, cancel, clear };
}
