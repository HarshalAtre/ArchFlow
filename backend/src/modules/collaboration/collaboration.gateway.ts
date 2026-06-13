import type { Server as HttpServer } from "node:http";

import { Server, type Socket } from "socket.io";

import { env } from "../../config/env.js";
import { findUserById } from "../auth/user.repository.js";
import {
  sessionTokenFromCookieHeader,
  verifySessionToken,
} from "../auth/session.js";
import {
  findBoardById,
  persistBoardGraph,
} from "../boards/board.repository.js";
import { validateBoardGraph } from "../boards/board.validation.js";
import {
  findLLDBoardById,
  persistLLDGraph,
} from "../lld-boards/lld-board.repository.js";
import { validateLLDGraph } from "../lld-boards/lld-board.validation.js";
import type { BoardGraph } from "../../types/board.js";
import type {
  CollaborationAck,
  CollaborationClientEvents,
  CollaborationGraph,
  CollaborationMode,
  CollaborationServerEvents,
  CollaborationSnapshot,
  CollaborationSocketData,
  CollaborationUpdatePayload,
  JoinCollaborationPayload,
} from "../../types/collaboration.js";
import type { LLDGraph } from "../../types/lld.js";
import {
  participantListForSockets,
  roomKeyFor,
} from "./collaboration.service.js";

type CollaborationSocket = Socket<
  CollaborationClientEvents,
  CollaborationServerEvents,
  never,
  CollaborationSocketData
>;

type RoomState = {
  boardId: string;
  graph: CollaborationGraph;
  lastEditorUserId: string;
  mode: CollaborationMode;
  persistTimer?: NodeJS.Timeout;
  revision: number;
};

const roomStates = new Map<string, RoomState>();
const persistDelayMs = 750;

export function attachCollaborationGateway(httpServer: HttpServer): void {
  const io = new Server<
    CollaborationClientEvents,
    CollaborationServerEvents,
    never,
    CollaborationSocketData
  >(httpServer, {
    cors: {
      credentials: true,
      origin: env.webOrigin,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = sessionTokenFromCookieHeader(
        socket.handshake.headers.cookie,
      );
      const userId = token ? await verifySessionToken(token) : null;
      const user = userId ? await findUserById(userId) : null;

      if (!user) {
        next(new Error("Authentication required"));
        return;
      }

      socket.data.user = {
        id: user.id,
        name: user.name,
        email: user.email,
      };
      next();
    } catch {
      next(new Error("Could not authenticate collaboration session"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("collaboration:join", async (payload, acknowledge) => {
      try {
        if (!isJoinPayload(payload)) {
          acknowledge({ ok: false, message: "Invalid collaboration room." });
          return;
        }

        await leaveCurrentRoom(io, socket);
        const initialGraph = await graphForAccessibleBoard(
          payload.mode,
          payload.boardId,
          socket.data.user.id,
        );

        if (!initialGraph) {
          acknowledge({
            ok: false,
            message: "Board not found or access was denied.",
          });
          return;
        }

        const roomKey = roomKeyFor(payload.mode, payload.boardId);
        const roomState = roomStates.get(roomKey) ?? {
          boardId: payload.boardId,
          graph: initialGraph,
          lastEditorUserId: socket.data.user.id,
          mode: payload.mode,
          revision: 0,
        };

        roomStates.set(roomKey, roomState);
        socket.data.roomKey = roomKey;
        await socket.join(roomKey);
        socket.emit("collaboration:snapshot", {
          ...payload,
          graph: roomState.graph,
          revision: roomState.revision,
        });
        await emitPresence(io, roomKey);
        acknowledge({ ok: true, revision: roomState.revision });
      } catch {
        acknowledge({
          ok: false,
          message: "Could not join the live board.",
        });
      }
    });

    socket.on("collaboration:update", (payload, acknowledge) => {
      const roomKey =
        isUpdatePayload(payload) &&
        roomKeyFor(payload.mode, payload.boardId);

      if (!roomKey || socket.data.roomKey !== roomKey) {
        acknowledge({
          ok: false,
          message: "Join this board before sending changes.",
        });
        return;
      }

      const validationErrors = validateCollaborationGraph(
        payload.mode,
        payload.graph,
      );

      if (validationErrors.length > 0) {
        acknowledge({
          ok: false,
          message: validationErrors[0],
        });
        return;
      }

      const currentState = roomStates.get(roomKey);
      const nextState: RoomState = {
        boardId: payload.boardId,
        graph: payload.graph,
        lastEditorUserId: socket.data.user.id,
        mode: payload.mode,
        persistTimer: currentState?.persistTimer,
        revision: (currentState?.revision ?? 0) + 1,
      };
      const snapshot: CollaborationSnapshot = {
        ...payload,
        revision: nextState.revision,
      };

      roomStates.set(roomKey, nextState);
      schedulePersistence(io, roomKey, nextState);
      socket.to(roomKey).emit("collaboration:snapshot", snapshot);
      acknowledge({ ok: true, revision: nextState.revision });
    });

    socket.on("collaboration:leave", () => {
      void leaveCurrentRoom(io, socket);
    });

    socket.on("disconnect", () => {
      const roomKey = socket.data.roomKey;

      if (roomKey) {
        socket.data.roomKey = undefined;
        void emitPresence(io, roomKey);
      }
    });
  });
}

async function leaveCurrentRoom(
  io: Server<
    CollaborationClientEvents,
    CollaborationServerEvents,
    never,
    CollaborationSocketData
  >,
  socket: CollaborationSocket,
): Promise<void> {
  const currentRoomKey = socket.data.roomKey;

  if (!currentRoomKey) {
    return;
  }

  socket.data.roomKey = undefined;
  await socket.leave(currentRoomKey);
  await emitPresence(io, currentRoomKey);
}

async function emitPresence(
  io: Server<
    CollaborationClientEvents,
    CollaborationServerEvents,
    never,
    CollaborationSocketData
  >,
  roomKey: string,
): Promise<void> {
  const sockets = [...(await io.in(roomKey).fetchSockets())];
  const participants = participantListForSockets(sockets);

  io.to(roomKey).emit("collaboration:presence", participants);

  if (sockets.length === 0) {
    await persistRoomState(io, roomKey);
    roomStates.delete(roomKey);
  }
}

async function graphForAccessibleBoard(
  mode: CollaborationMode,
  boardId: string,
  userId: string,
): Promise<CollaborationGraph | null> {
  if (mode === "hld") {
    const board = await findBoardById(boardId, userId);
    return board
      ? {
          elements: board.elements,
          edges: board.edges,
        }
      : null;
  }

  const board = await findLLDBoardById(boardId, userId);
  return board
    ? {
        classes: board.classes,
        relationships: board.relationships,
      }
    : null;
}

function schedulePersistence(
  io: Server<
    CollaborationClientEvents,
    CollaborationServerEvents,
    never,
    CollaborationSocketData
  >,
  roomKey: string,
  state: RoomState,
): void {
  if (state.persistTimer) {
    clearTimeout(state.persistTimer);
  }

  state.persistTimer = setTimeout(() => {
    void persistRoomState(io, roomKey);
  }, persistDelayMs);
}

async function persistRoomState(
  io: Server<
    CollaborationClientEvents,
    CollaborationServerEvents,
    never,
    CollaborationSocketData
  >,
  roomKey: string,
): Promise<void> {
  const state = roomStates.get(roomKey);

  if (!state) {
    return;
  }

  if (state.persistTimer) {
    clearTimeout(state.persistTimer);
    state.persistTimer = undefined;
  }

  try {
    const persisted =
      state.mode === "hld"
        ? await persistBoardGraph(
            state.boardId,
            state.lastEditorUserId,
            state.graph as BoardGraph,
          )
        : await persistLLDGraph(
            state.boardId,
            state.lastEditorUserId,
            state.graph as LLDGraph,
          );

    if (!persisted) {
      io.to(roomKey).emit(
        "collaboration:error",
        "Live changes could not be saved because board access changed.",
      );
    }
  } catch {
    io.to(roomKey).emit(
      "collaboration:error",
      "Live changes could not be saved. They remain visible in this session.",
    );
  }
}

function validateCollaborationGraph(
  mode: CollaborationMode,
  graph: CollaborationGraph,
): string[] {
  return mode === "hld"
    ? validateBoardGraph(graph as BoardGraph)
    : validateLLDGraph(graph as LLDGraph);
}

function isJoinPayload(value: unknown): value is JoinCollaborationPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<JoinCollaborationPayload>;
  return (
    typeof payload.boardId === "string" &&
    payload.boardId.length > 0 &&
    (payload.mode === "hld" || payload.mode === "lld")
  );
}

function isUpdatePayload(
  value: unknown,
): value is CollaborationUpdatePayload {
  return (
    isJoinPayload(value) &&
    "graph" in value &&
    Boolean(value.graph) &&
    typeof value.graph === "object"
  );
}
