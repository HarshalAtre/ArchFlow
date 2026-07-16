import type { BoardGraph } from "./board";
import type { LLDDraft } from "./lld";

export type CollaborationMode = "hld" | "lld";
export type CollaborationGraph = BoardGraph | LLDDraft;
export type CollaborationStatus =
  | "offline"
  | "connecting"
  | "live"
  | "error";

export type CollaborationParticipant = {
  id: string;
  name: string;
  connectionCount: number;
};

export type CollaborationCursor = CollaborationRoom & {
  userId: string;
  userName: string;
  x: number;
  y: number;
};

export type CollaborationCursorPayload = CollaborationRoom & {
  x: number;
  y: number;
};

export type CollaborationRoom = {
  boardId: string;
  mode: CollaborationMode;
};

export type CollaborationSnapshot = CollaborationRoom & {
  graph: CollaborationGraph;
  revision: number;
};

export type CollaborationUpdate = CollaborationRoom & {
  graph: CollaborationGraph;
};

export type CollaborationAck =
  | { ok: true; revision: number }
  | { ok: false; message: string };

export type CollaborationServerEvents = {
  "collaboration:error": (message: string) => void;
  "collaboration:presence": (
    participants: CollaborationParticipant[],
  ) => void;
  "collaboration:snapshot": (snapshot: CollaborationSnapshot) => void;
  "collaboration:cursor": (cursor: CollaborationCursor) => void;
};

export type CollaborationClientEvents = {
  "collaboration:join": (
    payload: CollaborationRoom,
    acknowledge: (result: CollaborationAck) => void,
  ) => void;
  "collaboration:leave": () => void;
  "collaboration:update": (
    payload: CollaborationUpdate,
    acknowledge: (result: CollaborationAck) => void,
  ) => void;
  "collaboration:cursor": (payload: CollaborationCursorPayload) => void;
};
