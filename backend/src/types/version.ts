import type { BoardGraph } from "./board.js";
import type { CollaborationMode } from "./collaboration.js";
import type { LLDGraph } from "./lld.js";

export type BoardVersionAction = "created" | "saved" | "live-update" | "restored";

export type BoardVersion = {
  id: string;
  boardId: string;
  mode: CollaborationMode;
  actorId: string;
  actorName: string;
  action: BoardVersionAction;
  graph: BoardGraph | LLDGraph;
  createdAt: string;
};

export type BoardVersionSummary = Omit<BoardVersion, "graph">;
