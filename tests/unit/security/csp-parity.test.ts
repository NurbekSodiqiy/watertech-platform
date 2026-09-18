import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCsp } from "@/lib/security/csp";

type BuildCsp = typeof buildCsp;

function isBuildCsp(value: unknown): value is BuildCsp {
  return typeof value === "function";
}

// next.config.js is CommonJS with its own copy of buildCsp (it can't import
// the TS module). Loading the real config file — not a re-typed copy — is
// what makes this test catch drift between the two.
const require = createRequire(import.meta.url);
const nextConfig: unknown = require(path.resolve(__dirname, "../../../next.config.js"));
const configBuildCsp: unknown =
  typeof nextConfig === "object" && nextConfig !== null ? Reflect.get(nextConfig, "buildCsp") : undefined;

describe("CSP builders", () => {
  it("next.config.js exposes its buildCsp copy", () => {
    expect(isBuildCsp(configBuildCsp)).toBe(true);
  });

  for (const isDev of [true, false]) {
    it(`produce identical output (isDev: ${isDev})`, () => {
      if (!isBuildCsp(configBuildCsp)) throw new Error("next.config.js does not expose buildCsp");
      const opts = { supabaseUrl: "https://abcd.supabase.co", isDev };
      expect(configBuildCsp(opts)).toBe(buildCsp(opts));
    });
  }
});
