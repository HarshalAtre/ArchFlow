import type { AuthUser } from "./auth.js";
import type { BoardAccessRole, BoardGraph } from "./board.js";
import type { LLDGraph } from "./lld.js";

export type CollaborationMode = "hld" | "lld";
export type CollaborationGraph = BoardGraph | LLDGraph;

export type CollaborationParticipant = Pick<AuthUser, "id" | "name"> & {
  connectionCount: number;
};

export type JoinCollaborationPayload = {
  boardId: string;
  mode: CollaborationMode;
};

export type CollaborationUpdatePayload = JoinCollaborationPayload & {
  graph: CollaborationGraph;
};

export type CollaborationSnapshot = CollaborationUpdatePayload & {
  revision: number;
};

export type CollaborationCursor = JoinCollaborationPayload & {
  userId: string;
  userName: string;
  x: number;
  y: number;
};

export type CollaborationCursorPayload = JoinCollaborationPayload & {
  x: number;
  y: number;
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
    payload: JoinCollaborationPayload,
    acknowledge: (result: CollaborationAck) => void,
  ) => void;
  "collaboration:leave": () => void;
  "collaboration:update": (
    payload: CollaborationUpdatePayload,
    acknowledge: (result: CollaborationAck) => void,
  ) => void;
  "collaboration:cursor": (payload: CollaborationCursorPayload) => void;
};

export type CollaborationSocketData = {
  accessRole?: BoardAccessRole;
  roomKey?: string;
  user: AuthUser;
};
