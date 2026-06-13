import { describe, expect, it } from "vitest";

import { lldAccessFilterForUser } from "./lld-board.repository.js";

describe("LLD board access filter", () => {
  it("allows owners and accepted collaborators", () => {
    expect(lldAccessFilterForUser("user-1")).toEqual({
      $or: [
        { ownerId: "user-1" },
        { collaboratorIds: "user-1" },
      ],
    });
  });
});
