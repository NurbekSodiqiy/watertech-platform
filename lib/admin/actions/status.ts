import type { z } from "zod";
import type { statusSchema } from "@/lib/admin/schemas";

export type StatusValue = z.infer<typeof statusSchema>;
