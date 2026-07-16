import type { Server as HttpServer } from "node:http";

import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server, type Socket } from "socket.io";

import { env } from "../../config/env.js";
import type { BoardGraph } from "../../types/board.js";
import type {
  CollaborationAck,
  CollaborationClientEvents,
  CollaborationCursorPayload,
  CollaborationGraph,
  CollaborationMode,
  CollaborationServerEvents,
  CollaborationSnapshot,
  CollaborationSocketData,
  CollaborationUpdatePayload,
  JoinCollaborationPayload,
} from "../../types/collaboration.js";
import type { LLDGraph } from "../../types/lld.js";
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
import { recordBoardVersion } from "../versions/version.repository.js";

import {
  type CollaborationRoomState,
  type CollaborationStateStore,
  LocalCollaborationStateStore,
  RedisCollaborationStateStore,
} from "./collaboration-state.store.js";
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

type CollaborationServer = Server<
  CollaborationClientEvents,
  CollaborationServerEvents,
  never,
  CollaborationSocketData
>;

const persistDelayMs = 750;

export async function attachCollaborationGateway(
  httpServer: HttpServer,
): Promise<void> {
  const io: CollaborationServer = new Server(httpServer, {
    cors: {
      credentials: true,
      origin: env.webOrigin,
    },
  });
  const stateStore = await configureRedis(io);
  const persistTimers = new Map<string, NodeJS.Timeout>();

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
        const accessibleBoard = await graphForAccessibleBoard(
          payload.mode,
          payload.boardId,
          socket.data.user.id,
        );

        if (!accessibleBoard) {
          acknowledge({
            ok: false,
            message: "Board not found or access was denied.",
          });
          return;
        }

        const roomKey = roomKeyFor(payload.mode, payload.boardId);
        const roomState =
          (await stateStore.get(roomKey)) ??
          (await stateStore.update(roomKey, {
            boardId: payload.boardId,
            graph: accessibleBoard.graph,
            lastEditorName: socket.data.user.name,
            lastEditorUserId: socket.data.user.id,
            mode: payload.mode,
          }));

        socket.data.accessRole = accessibleBoard.accessRole;
        socket.data.roomKey = roomKey;
        await socket.join(roomKey);
        socket.emit("collaboration:snapshot", {
          ...payload,
          graph: roomState.graph,
          revision: roomState.revision,
        });
        await emitPresence(io, roomKey, stateStore, persistTimers);
        acknowledge({ ok: true, revision: roomState.revision });
      } catch {
        acknowledge({ ok: false, message: "Could not join the live board." });
      }
    });

    socket.on("collaboration:update", async (payload, acknowledge) => {
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

      const currentAccess = await graphForAccessibleBoard(
        payload.mode,
        payload.boardId,
        socket.data.user.id,
      );

      if (!currentAccess) {
        socket.data.accessRole = undefined;
        acknowledge({
          ok: false,
          message: "Your access to this board was removed.",
        });
        return;
      }

      socket.data.accessRole = currentAccess.accessRole;

      if (currentAccess.accessRole === "viewer") {
        acknowledge({
          ok: false,
          message: "This board was shared with view-only access.",
        });
        return;
      }

      const validationErrors = validateCollaborationGraph(
        payload.mode,
        payload.graph,
      );

      if (validationErrors.length > 0) {
        acknowledge({ ok: false, message: validationErrors[0] });
        return;
      }

      try {
        const nextState = await stateStore.update(roomKey, {
          boardId: payload.boardId,
          graph: payload.graph,
          lastEditorName: socket.data.user.name,
          lastEditorUserId: socket.data.user.id,
          mode: payload.mode,
        });
        const snapshot: CollaborationSnapshot = {
          ...payload,
          revision: nextState.revision,
        };

        schedulePersistence(
          io,
          roomKey,
          stateStore,
          persistTimers,
        );
        socket.to(roomKey).emit("collaboration:snapshot", snapshot);
        acknowledge({ ok: true, revision: nextState.revision });
      } catch {
        acknowledge({
          ok: false,
          message: "The live update could not be synchronized.",
        });
      }
    });

    socket.on("collaboration:cursor", (payload) => {
      if (
        !isCursorPayload(payload) ||
        socket.data.roomKey !== roomKeyFor(payload.mode, payload.boardId)
      ) {
        return;
      }

      socket.to(socket.data.roomKey).emit("collaboration:cursor", {
        ...payload,
        userId: socket.data.user.id,
        userName: socket.data.user.name,
      });
    });

    socket.on("collaboration:leave", () => {
      void leaveCurrentRoom(io, socket).then((roomKey) => {
        if (roomKey) {
          return emitPresence(io, roomKey, stateStore, persistTimers);
        }
      });
    });

    socket.on("disconnect", () => {
      const roomKey = socket.data.roomKey;
      socket.data.roomKey = undefined;
      socket.data.accessRole = undefined;

      if (roomKey) {
        void emitPresence(io, roomKey, stateStore, persistTimers);
      }
    });
  });
}

async function configureRedis(
  io: CollaborationServer,
): Promise<CollaborationStateStore> {
  if (!env.redisUrl) {
    console.log("Redis not configured; collaboration is running in single-instance mode.");
    return new LocalCollaborationStateStore();
  }

  const publisher = createClient({ url: env.redisUrl });
  const subscriber = publisher.duplicate();

  try {
    await Promise.all([publisher.connect(), subscriber.connect()]);
    io.adapter(createAdapter(publisher, subscriber));
    console.log("Redis collaboration adapter connected.");
    return new RedisCollaborationStateStore(publisher);
  } catch (error) {
    console.warn("Redis unavailable; using single-instance collaboration.", error);
    await Promise.allSettled([publisher.disconnect(), subscriber.disconnect()]);
    return new LocalCollaborationStateStore();
  }
}

async function leaveCurrentRoom(
  io: CollaborationServer,
  socket: CollaborationSocket,
): Promise<string | null> {
  const currentRoomKey = socket.data.roomKey;

  if (!currentRoomKey) {
    return null;
  }

  socket.data.roomKey = undefined;
  socket.data.accessRole = undefined;
  await socket.leave(currentRoomKey);
  return currentRoomKey;
}

async function emitPresence(
  io: CollaborationServer,
  roomKey: string,
  stateStore: CollaborationStateStore,
  persistTimers: Map<string, NodeJS.Timeout>,
): Promise<void> {
  if (!roomKey) {
    return;
  }

  const sockets = [...(await io.in(roomKey).fetchSockets())];
  io.to(roomKey).emit(
    "collaboration:presence",
    participantListForSockets(sockets),
  );

  if (sockets.length === 0) {
    if (persistTimers.has(roomKey)) {
      await persistRoomState(io, roomKey, stateStore, persistTimers);
    }
    await stateStore.delete(roomKey);
  }
}

async function graphForAccessibleBoard(
  mode: CollaborationMode,
  boardId: string,
  userId: string,
) {
  if (mode === "hld") {
    const board = await findBoardById(boardId, userId);
    return board
      ? {
          accessRole: board.accessRole ?? "viewer",
          graph: { elements: board.elements, edges: board.edges },
        }
      : null;
  }

  const board = await findLLDBoardById(boardId, userId);
  return board
    ? {
        accessRole: board.accessRole ?? "viewer",
        graph: {
          classes: board.classes,
          relationships: board.relationships,
        },
      }
    : null;
}

function schedulePersistence(
  io: CollaborationServer,
  roomKey: string,
  stateStore: CollaborationStateStore,
  persistTimers: Map<string, NodeJS.Timeout>,
): void {
  const currentTimer = persistTimers.get(roomKey);

  if (currentTimer) {
    clearTimeout(currentTimer);
  }

  persistTimers.set(
    roomKey,
    setTimeout(() => {
      void persistRoomState(io, roomKey, stateStore, persistTimers);
    }, persistDelayMs),
  );
}

async function persistRoomState(
  io: CollaborationServer,
  roomKey: string,
  stateStore: CollaborationStateStore,
  persistTimers: Map<string, NodeJS.Timeout>,
): Promise<void> {
  const timer = persistTimers.get(roomKey);

  if (timer) {
    clearTimeout(timer);
    persistTimers.delete(roomKey);
  }

  const state = await stateStore.get(roomKey);

  if (!state) {
    return;
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
      return;
    }

    await recordBoardVersion({
      action: "live-update",
      actorId: state.lastEditorUserId,
      actorName: state.lastEditorName,
      boardId: state.boardId,
      graph: state.graph,
      mode: state.mode,
    });
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

function isUpdatePayload(value: unknown): value is CollaborationUpdatePayload {
  return (
    isJoinPayload(value) &&
    "graph" in value &&
    Boolean(value.graph) &&
    typeof value.graph === "object"
  );
}

function isCursorPayload(value: unknown): value is CollaborationCursorPayload {
  return (
    isJoinPayload(value) &&
    "x" in value &&
    typeof value.x === "number" &&
    "y" in value &&
    typeof value.y === "number"
  );
}
