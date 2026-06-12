import { describe, expect, it } from "vitest";

import {
  validateLoginInput,
  validateRegistrationInput,
} from "./auth.validation.js";

describe("auth validation", () => {
  it("normalizes valid registration details", () => {
    const result = validateRegistrationInput({
      name: "  Harshal Atre  ",
      email: "  Harshal@Example.com ",
      password: "secure-password",
    });

    expect(result).toEqual({
      data: {
        name: "Harshal Atre",
        email: "harshal@example.com",
        password: "secure-password",
      },
      errors: [],
    });
  });

  it("rejects weak registration input", () => {
    const result = validateRegistrationInput({
      name: "H",
      email: "invalid",
      password: "short",
    });

    expect(result.data).toBeUndefined();
    expect(result.errors).toHaveLength(3);
  });

  it("requires both login fields", () => {
    const result = validateLoginInput({
      email: "harshal@example.com",
      password: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.errors).toEqual(["Enter your email and password."]);
  });
});
