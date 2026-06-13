import { describe, expect, it } from "vitest";

import {
  participantListForSockets,
  roomKeyFor,
} from "./collaboration.service.js";

describe("collaboration service", () => {
  it("uses separate rooms for HLD and LLD boards", () => {
    expect(roomKeyFor("hld", "board-1")).toBe("board:hld:board-1");
    expect(roomKeyFor("lld", "board-1")).toBe("board:lld:board-1");
  });

  it("groups multiple sessions for the same user", () => {
    const sockets = [
      socketFor("user-1", "Harshal"),
      socketFor("user-1", "Harshal"),
      socketFor("user-2", "Asha"),
    ];

    expect(participantListForSockets(sockets as never)).toEqual([
      { id: "user-2", name: "Asha", connectionCount: 1 },
      { id: "user-1", name: "Harshal", connectionCount: 2 },
    ]);
  });
});

function socketFor(id: string, name: string) {
  return {
    data: {
      user: {
        id,
        name,
        email: `${id}@example.com`,
      },
    },
  };
}
