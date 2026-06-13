import { describe, expect, it } from "vitest";

import { accessFilterForUser } from "./board.repository.js";

describe("board access filter", () => {
  it("allows owners and accepted collaborators", () => {
    expect(accessFilterForUser("user-1")).toEqual({
      $or: [
        { ownerId: "user-1" },
        { collaboratorIds: "user-1" },
      ],
    });
  });
});
