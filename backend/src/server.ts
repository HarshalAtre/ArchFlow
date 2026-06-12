import { randomUUID } from "node:crypto";

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
  findBoardById,
  listRecentBoards,
  updateBoard,
} from "./modules/boards/board.repository.js";
import { validateBoardGraph } from "./modules/boards/board.validation.js";
import {
  createLLDBoard,
  findLLDBoardById,
  listRecentLLDBoards,
  updateLLDBoard,
} from "./modules/lld-boards/lld-board.repository.js";
import { validateLLDGraph } from "./modules/lld-boards/lld-board.validation.js";
import {
  authUserFromResponse,
  requireAuth,
} from "./modules/auth/auth.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
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
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", authRouter);

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
  response.status(201).json(createdBoard);
}));

app.get("/api/boards/:boardId", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const board = await findBoardById(request.params.boardId, user.id);

  if (!board) {
    response.status(404).json({ message: "Board not found" });
    return;
  }

  response.json(board);
}));

app.patch("/api/boards/:boardId", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const currentBoard = await findBoardById(request.params.boardId, user.id);

  if (!currentBoard) {
    response.status(404).json({ message: "Board not found" });
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
  response.json(updatedBoard);
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
    ...graph,
    createdAt: now,
    updatedAt: now,
  };

  const createdBoard = await createLLDBoard(board);
  response.status(201).json(createdBoard);
}));

app.get("/api/lld-boards/:boardId", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const board = await findLLDBoardById(request.params.boardId, user.id);

  if (!board) {
    response.status(404).json({ message: "LLD board not found" });
    return;
  }

  response.json(board);
}));

app.patch("/api/lld-boards/:boardId", requireAuth, asyncHandler(async (request: Request, response: Response) => {
  const user = authUserFromResponse(response);
  const currentBoard = await findLLDBoardById(request.params.boardId, user.id);

  if (!currentBoard) {
    response.status(404).json({ message: "LLD board not found" });
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
  response.json(updatedBoard);
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

  app.listen(env.port, () => {
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
