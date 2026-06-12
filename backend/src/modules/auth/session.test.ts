import { describe, expect, it } from "vitest";

import {
  createSessionToken,
  sessionCookieName,
  sessionTokenFromCookieHeader,
  verifySessionToken,
} from "./session.js";

describe("auth sessions", () => {
  it("round-trips a signed user session", async () => {
    const token = await createSessionToken("user-123");

    await expect(verifySessionToken(token)).resolves.toBe("user-123");
  });

  it("reads the session token from a cookie header", () => {
    expect(
      sessionTokenFromCookieHeader(
        `theme=light; ${sessionCookieName}=signed.token.value; locale=en`,
      ),
    ).toBe("signed.token.value");
  });

  it("rejects a modified session", async () => {
    const token = await createSessionToken("user-123");

    await expect(verifySessionToken(`${token}modified`)).resolves.toBeNull();
  });
});
