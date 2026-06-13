import { describe, expect, it } from "vitest";

import {
  createShareToken,
  modeFromShareToken,
} from "./sharing.routes.js";

describe("sharing tokens", () => {
  it("creates mode-scoped high-entropy tokens", () => {
    const hldToken = createShareToken("hld");
    const lldToken = createShareToken("lld");

    expect(hldToken).toMatch(/^hld_[A-Za-z0-9_-]{32}$/);
    expect(lldToken).toMatch(/^lld_[A-Za-z0-9_-]{32}$/);
    expect(hldToken).not.toBe(createShareToken("hld"));
  });

  it("derives the board mode from a valid token", () => {
    expect(modeFromShareToken("hld_example")).toBe("hld");
    expect(modeFromShareToken("lld_example")).toBe("lld");
    expect(modeFromShareToken("unknown_example")).toBeNull();
  });
});
