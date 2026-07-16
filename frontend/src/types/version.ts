import type { CollaborationGraph, CollaborationMode } from "./collaboration";

export type BoardVersion = {
  id: string;
  boardId: string;
  mode: CollaborationMode;
  actorId: string;
  actorName: string;
  action: "created" | "saved" | "live-update" | "restored";
  createdAt: string;
};

export type RestoredVersion = {
  graph: CollaborationGraph;
};
