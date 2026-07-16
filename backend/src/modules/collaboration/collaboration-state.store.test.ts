import { describe, expect, it } from "vitest";

import { LocalCollaborationStateStore } from "./collaboration-state.store.js";

describe("local collaboration state store", () => {
  it("increments revisions and keeps the latest graph", async () => {
    const store = new LocalCollaborationStateStore();
    const roomKey = "board:hld:board-1";
    const baseState = {
      boardId: "board-1",
      graph: { elements: [], edges: [] },
      lastEditorName: "Harshal",
      lastEditorUserId: "user-1",
      mode: "hld" as const,
    };

    expect((await store.update(roomKey, baseState)).revision).toBe(1);
    expect((await store.update(roomKey, baseState)).revision).toBe(2);
    expect((await store.get(roomKey))?.graph).toEqual(baseState.graph);

    await store.delete(roomKey);
    expect(await store.get(roomKey)).toBeNull();
  });
});
