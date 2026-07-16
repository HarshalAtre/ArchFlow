import { describe, expect, it } from "vitest";

import {
  accessFilterForUser,
  editFilterForUser,
} from "./board.repository.js";

describe("board access filter", () => {
  it("allows owners, editors, and viewers to read", () => {
    expect(accessFilterForUser("user-1")).toEqual({
      $or: [
        { ownerId: "user-1" },
        { collaboratorIds: "user-1" },
        { viewerIds: "user-1" },
      ],
    });
  });

  it("allows only owners and editors to write", () => {
    expect(editFilterForUser("user-1")).toEqual({
      $or: [
        { ownerId: "user-1" },
        { collaboratorIds: "user-1" },
      ],
    });
  });
});
