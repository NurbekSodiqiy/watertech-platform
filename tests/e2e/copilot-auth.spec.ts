import { test, expect } from "@playwright/test";

// /api/* is outside the middleware matcher, so each Route Handler enforces its
// own auth. `request` carries no cookies.

test.describe("Copilot API without a session", () => {
  test("POST /api/copilot is rejected", async ({ request }) => {
    const res = await request.post("/api/copilot", { data: { question: "Chegirma qancha?", locale: "uz" } });

    // The route checks the session before GEMINI_API_KEY, so this is 401
    // today. 503 (copilot disabled — CI has no key) is accepted as well: it
    // is also a refusal that never reaches retrieval or the model.
    expect([401, 503]).toContain(res.status());
    expect(await res.json()).toEqual({ error: expect.any(String) });
  });

  test("auth runs before validation: a 2-char question is still 401, not 400", async ({ request }) => {
    const res = await request.post("/api/copilot", { data: { question: "ha", locale: "uz" } });

    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });
});

test.describe("content-scan cron without the bearer secret", () => {
  test("GET /api/cron/content-scan without Authorization is 401", async ({ request }) => {
    const res = await request.get("/api/cron/content-scan");

    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: expect.any(String) });
  });

  test("GET /api/cron/content-scan with a wrong bearer is 401", async ({ request }) => {
    const res = await request.get("/api/cron/content-scan", { headers: { Authorization: "Bearer not-the-cron-secret" } });

    expect(res.status()).toBe(401);
  });
});
