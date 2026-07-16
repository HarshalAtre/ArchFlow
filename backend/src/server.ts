import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

import cors from "cors";
import express, { NextFunction, Request, Response } from "express";

import { asyncHandler } from "./http/async-handler.js";
import {
  analyzeHLDWithAI,
  analyzeLLDWithAI,
} from "./modules/ai/ai.service.js";
import { cleanupArchitectureLayout } from "./modules/architecture/architecture.service.js";
import {
  createBoard,
  deleteOwnedBoard,
  findBoardById,
  leaveBoard,
  listRecentBoards,
  updateBoard,
} from "./modules/boards/board.repository.js";
import { validateBoardGraph } from "./modules/boards/board.validation.js";
import {
  createLLDBoard,
  deleteOwnedLLDBoard,
  findLLDBoardById,
  leaveLLDBoard,
  listRecentLLDBoards,
  updateLLDBoard,
} from "./modules/lld-boards/lld-board.repository.js";
import { validateLLDGraph } from "./modules/lld-boards/lld-board.validation.js";
import { attachCollaborationGateway } from "./modules/collaboration/collaboration.gateway.js";
import {
  authUserFromResponse,
  requireAuth,
} from "./modules/auth/auth.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { sharingRouter } from "./modules/sharing/sharing.routes.js";
import { versionRouter } from "./modules/versions/version.routes.js";
import {
  deleteBoardVersions,
  recordBoardVersion,
} from "./modules/versions/version.repository.js";
import { env } from "./config/env.js";
import { connectToMongo } from "./database/mongo.js";
import type { Board, BoardGraph } from "./types/board.js";
import type { LLDBoard, LLDGraph } from "./types/lld.js";

const app = express();
app.use(
  cors({
    credentials: true,
    origin: env.webOrigin,
  }),
);
app.use((request: Request, response: Response, next: NextFunction) => {
  const isSafeMethod = ["GET", "HEAD", "OPTIONS"].includes(request.method);
  const origin = request.headers.origin;

  if (!isSafeMethod && origin && origin !== env.webOrigin) {
    response.status(403).json({ message: "Request origin is not allowed." });
    return;
  }

  next();
});
app.use(express.json({ limit: "5mb" }));
app.use("/api/auth", authRouter);
app.use("/api/shares", sharingRouter);
app.use("/api/versions", versionRouter);

app.get("/api/health", (_request: Request, response: Response) => {
  response.json({
    ok: true,
    service: "archflow-api",
  });
});

app.get("/api/boards", requireAuth, asyncHandler(async (_request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const boards = await listRecentBoards(user.id);
  response.json({ boards });
}));

app.post("/api/boards", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const now = new Date().toISOString();
  const graph = request.body as Partial<BoardGraph>;
  const board: Board = {
    id: randomUUID(),
    name: typeof request.body?.name === "string" ? request.body.name : "Untitled Board",
    ownerId: user.id,
    collaboratorIds: [],
    viewerIds: [],
    elements: graph.elements ?? [],
    edges: graph.edges ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const errors = validateBoardGraph(board);

  if (errors.length > 0) {
    response.status(400).json({ errors });
    return;
  }

  const createdBoard = await createBoard(board);
  await recordBoardVersion({
    action: "created",
    actorId: user.id,
    actorName: user.name,
    boardId: createdBoard.id,
    graph: { elements: createdBoard.elements, edges: createdBoard.edges },
    mode: "hld",
  });
  response.status(201).json(withoutShareToken(createdBoard));
}));

app.get("/api/boards/:boardId", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const board = await findBoardById(request.params.boardId, user.id);

  if (!board) {
    response.status(404).json({ message: "Board not found" });
    return;
  }

  response.json(withoutShareToken(board));
}));

app.patch("/api/boards/:boardId", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const currentBoard = await findBoardById(request.params.boardId, user.id);

  if (!currentBoard) {
    response.status(404).json({ message: "Board not found" });
    return;
  }

  if (currentBoard.accessRole === "viewer") {
    response.status(403).json({ message: "This board is view-only." });
    return;
  }

  const nextBoard: Board = {
    ...currentBoard,
    name: typeof request.body?.name === "string" ? request.body.name : currentBoard.name,
    elements: Array.isArray(request.body?.elements) ? request.body.elements : currentBoard.elements,
    edges: Array.isArray(request.body?.edges) ? request.body.edges : currentBoard.edges,
    updatedAt: new Date().toISOString(),
  };

  const errors = validateBoardGraph(nextBoard);

  if (errors.length > 0) {
    response.status(400).json({ errors });
    return;
  }

  const updatedBoard = await updateBoard(nextBoard, user.id);
  if (updatedBoard) {
    await recordBoardVersion({
      action: "saved",
      actorId: user.id,
      actorName: user.name,
      boardId: updatedBoard.id,
      graph: { elements: updatedBoard.elements, edges: updatedBoard.edges },
      mode: "hld",
    });
  }
  response.json(updatedBoard ? withoutShareToken(updatedBoard) : null);
}));

app.post("/api/boards/:boardId/duplicate", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const sourceBoard = await findBoardById(request.params.boardId, user.id);

  if (!sourceBoard) {
    response.status(404).json({ message: "Board not found" });
    return;
  }

  const now = new Date().toISOString();
  const duplicate: Board = {
    id: randomUUID(),
    name: normalizedBoardName(request.body?.name, `${sourceBoard.name} Copy`),
    ownerId: user.id,
    collaboratorIds: [],
    viewerIds: [],
    elements: sourceBoard.elements,
    edges: sourceBoard.edges,
    createdAt: now,
    updatedAt: now,
  };
  const createdBoard = await createBoard(duplicate);
  await recordBoardVersion({
    action: "created",
    actorId: user.id,
    actorName: user.name,
    boardId: createdBoard.id,
    graph: { elements: createdBoard.elements, edges: createdBoard.edges },
    mode: "hld",
  });
  response.status(201).json(withoutShareToken(createdBoard));
}));

app.delete("/api/boards/:boardId", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const board = await findBoardById(request.params.boardId, user.id);

  if (!board) {
    response.status(404).json({ message: "Board not found" });
    return;
  }

  if (board.ownerId === user.id) {
    const deleted = await deleteOwnedBoard(board.id, user.id);

    if (!deleted) {
      response.status(409).json({ message: "Board could not be deleted." });
      return;
    }

    await deleteBoardVersions("hld", board.id);
    response.json({ action: "deleted" });
    return;
  }

  const left = await leaveBoard(board.id, user.id);
  response.status(left ? 200 : 409).json(
    left
      ? { action: "left" }
      : { message: "Shared board could not be left." },
  );
}));

app.get("/api/lld-boards", requireAuth, asyncHandler(async (_request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const boards = await listRecentLLDBoards(user.id);
  response.json({ boards });
}));

app.post("/api/lld-boards", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const now = new Date().toISOString();
  const graph: LLDGraph = {
    classes: Array.isArray(request.body?.classes) ? request.body.classes : [],
    relationships: Array.isArray(request.body?.relationships)
      ? request.body.relationships
      : [],
  };
  const errors = validateLLDGraph(graph);

  if (errors.length > 0) {
    response.status(400).json({ errors });
    return;
  }

  const board: LLDBoard = {
    id: randomUUID(),
    name: normalizedBoardName(request.body?.name, "Untitled LLD"),
    ownerId: user.id,
    collaboratorIds: [],
    viewerIds: [],
    ...graph,
    createdAt: now,
    updatedAt: now,
  };

  const createdBoard = await createLLDBoard(board);
  await recordBoardVersion({
    action: "created",
    actorId: user.id,
    actorName: user.name,
    boardId: createdBoard.id,
    graph: {
      classes: createdBoard.classes,
      relationships: createdBoard.relationships,
    },
    mode: "lld",
  });
  response.status(201).json(withoutShareToken(createdBoard));
}));

app.get("/api/lld-boards/:boardId", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const board = await findLLDBoardById(request.params.boardId, user.id);

  if (!board) {
    response.status(404).json({ message: "LLD board not found" });
    return;
  }

  response.json(withoutShareToken(board));
}));

app.patch("/api/lld-boards/:boardId", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const currentBoard = await findLLDBoardById(request.params.boardId, user.id);

  if (!currentBoard) {
    response.status(404).json({ message: "LLD board not found" });
    return;
  }

  if (currentBoard.accessRole === "viewer") {
    response.status(403).json({ message: "This LLD board is view-only." });
    return;
  }

  const nextBoard: LLDBoard = {
    ...currentBoard,
    name: normalizedBoardName(request.body?.name, currentBoard.name),
    classes: Array.isArray(request.body?.classes) ? request.body.classes : currentBoard.classes,
    relationships: Array.isArray(request.body?.relationships)
      ? request.body.relationships
      : currentBoard.relationships,
    updatedAt: new Date().toISOString(),
  };
  const errors = validateLLDGraph(nextBoard);

  if (errors.length > 0) {
    response.status(400).json({ errors });
    return;
  }

  const updatedBoard = await updateLLDBoard(nextBoard, user.id);
  if (updatedBoard) {
    await recordBoardVersion({
      action: "saved",
      actorId: user.id,
      actorName: user.name,
      boardId: updatedBoard.id,
      graph: {
        classes: updatedBoard.classes,
        relationships: updatedBoard.relationships,
      },
      mode: "lld",
    });
  }
  response.json(updatedBoard ? withoutShareToken(updatedBoard) : null);
}));

app.post("/api/lld-boards/:boardId/duplicate", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const sourceBoard = await findLLDBoardById(request.params.boardId, user.id);

  if (!sourceBoard) {
    response.status(404).json({ message: "LLD board not found" });
    return;
  }

  const now = new Date().toISOString();
  const duplicate: LLDBoard = {
    id: randomUUID(),
    name: normalizedBoardName(request.body?.name, `${sourceBoard.name} Copy`),
    ownerId: user.id,
    collaboratorIds: [],
    viewerIds: [],
    classes: sourceBoard.classes,
    relationships: sourceBoard.relationships,
    createdAt: now,
    updatedAt: now,
  };
  const createdBoard = await createLLDBoard(duplicate);
  await recordBoardVersion({
    action: "created",
    actorId: user.id,
    actorName: user.name,
    boardId: createdBoard.id,
    graph: {
      classes: createdBoard.classes,
      relationships: createdBoard.relationships,
    },
    mode: "lld",
  });
  response.status(201).json(withoutShareToken(createdBoard));
}));

app.delete("/api/lld-boards/:boardId", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const board = await findLLDBoardById(request.params.boardId, user.id);

  if (!board) {
    response.status(404).json({ message: "LLD board not found" });
    return;
  }

  if (board.ownerId === user.id) {
    const deleted = await deleteOwnedLLDBoard(board.id, user.id);

    if (!deleted) {
      response.status(409).json({ message: "LLD board could not be deleted." });
      return;
    }

    await deleteBoardVersions("lld", board.id);
    response.json({ action: "deleted" });
    return;
  }

  const left = await leaveLLDBoard(board.id, user.id);
  response.status(left ? 200 : 409).json(
    left
      ? { action: "left" }
      : { message: "Shared LLD board could not be left." },
  );
}));

app.post("/api/ai/analyze/hld", asyncHandler(async (request: Request, response: Response) => {
  const graph = request.body as BoardGraph;
  const errors = validateBoardGraph(graph);

  if (errors.length > 0) {
    response.status(400).json({ errors });
    return;
  }

  response.json(await analyzeHLDWithAI(graph));
}));

app.post("/api/ai/analyze/lld", asyncHandler(async (request: Request, response: Response) => {
  const graph = request.body as LLDGraph;
  const errors = validateLLDGraph(graph);

  if (errors.length > 0) {
    response.status(400).json({ errors });
    return;
  }

  response.json(await analyzeLLDWithAI(graph));
}));

app.post("/api/architecture/cleanup", (request: Request, response: Response) => {
  const graph = request.body as BoardGraph;
  const errors = validateBoardGraph(graph);

  if (errors.length > 0) {
    response.status(400).json({ errors });
    return;
  }

  response.json(cleanupArchitectureLayout(graph));
});

app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    console.error("API request failed", error);

    if (response.headersSent) {
      return;
    }

    const isValidationError =
      Boolean(error) &&
      typeof error === "object" &&
      (error as { name?: unknown }).name === "ValidationError";

    response.status(isValidationError ? 400 : 500).json({
      message: isValidationError
        ? "The board contains data that could not be saved."
        : "The server could not complete this request.",
    });
  },
);

async function bootstrap(): Promise<void> {
  if (!env.mongoUri) {
    throw new Error("MONGO_URI is required");
  }

  if (env.nodeEnv === "production" && env.authSecret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters in production");
  }

  await connectToMongo(env.mongoUri);

  const httpServer = createServer(app);
  await attachCollaborationGateway(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start API", error);
  process.exit(1);
});

function normalizedBoardName(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function withoutShareToken<T extends { shareToken?: string }>(
  value: T,
): Omit<T, "shareToken"> {
  const { shareToken: _shareToken, ...publicValue } = value;
  return publicValue;
}
