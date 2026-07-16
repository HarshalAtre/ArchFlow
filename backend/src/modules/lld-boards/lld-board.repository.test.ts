import { describe, expect, it } from "vitest";

import {
  lldAccessFilterForUser,
  lldEditFilterForUser,
} from "./lld-board.repository.js";

describe("LLD board access filter", () => {
  it("allows owners, editors, and viewers to read", () => {
    expect(lldAccessFilterForUser("user-1")).toEqual({
      $or: [
        { ownerId: "user-1" },
        { collaboratorIds: "user-1" },
        { viewerIds: "user-1" },
      ],
    });
  });

  it("allows only owners and editors to write", () => {
    expect(lldEditFilterForUser("user-1")).toEqual({
      $or: [
        { ownerId: "user-1" },
        { collaboratorIds: "user-1" },
      ],
    });
  });
});
