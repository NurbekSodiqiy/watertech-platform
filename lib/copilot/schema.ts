import { z } from "zod";

export const copilotHistoryTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(1500),
});

export const copilotRequestSchema = z.object({
  question: z.string().trim().min(3).max(400),
  locale: z.enum(["uz", "ru"]),
  history: z.array(copilotHistoryTurnSchema).max(6).default([]),
});

export type CopilotHistoryTurn = z.infer<typeof copilotHistoryTurnSchema>;
export type CopilotRequest = z.infer<typeof copilotRequestSchema>;
