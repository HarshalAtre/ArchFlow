import { randomUUID } from "node:crypto";

import cors from "cors";
import express, { Request, Response } from "express";

import {
  analyzeHLDWithAI,
  analyzeLLDWithAI,
} from "./modules/ai/ai.service.js";
import { cleanupArchitectureLayout } from "./modules/architecture/architecture.service.js";
import { createBoard, findBoardById, updateBoard } from "./modules/boards/board.repository.js";
import { validateBoardGraph } from "./modules/boards/board.validation.js";
import {
  createLLDBoard,
  findLLDBoardById,
  listRecentLLDBoards,
  updateLLDBoard,
} from "./modules/lld-boards/lld-board.repository.js";
import { validateLLDGraph } from "./modules/lld-boards/lld-board.validation.js";
import { env } from "./config/env.js";
import { connectToMongo } from "./database/mongo.js";
import type { Board, BoardGraph } from "./types/board.js";
import type { LLDBoard, LLDGraph } from "./types/lld.js";

const app = express();
app.use(
  cors({
    origin: env.webOrigin,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request: Request, response: Response) => {
  response.json({
    ok: true,
    service: "archflow-api",
  });
});

app.post("/api/boards", async (request: Request, response: Response) => {
  const now = new Date().toISOString();
  const graph = request.body as Partial<BoardGraph>;
  const board: Board = {
    id: randomUUID(),
    name: typeof request.body?.name === "string" ? request.body.name : "Untitled Board",
    ownerId: "demo-user",
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
});

app.get("/api/boards/:boardId", async (request: Request, response: Response) => {
  const board = await findBoardById(request.params.boardId);

  if (!board) {
    response.status(404).json({ message: "Board not found" });
    return;
  }

  response.json(board);
});

app.patch("/api/boards/:boardId", async (request: Request, response: Response) => {
  const currentBoard = await findBoardById(request.params.boardId);

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

  const updatedBoard = await updateBoard(nextBoard);
  response.json(updatedBoard);
});

app.get("/api/lld-boards", async (_request: Request, response: Response) => {
  const boards = await listRecentLLDBoards("demo-user");
  response.json({ boards });
});

app.post("/api/lld-boards", async (request: Request, response: Response) => {
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
    ownerId: "demo-user",
    ...graph,
    createdAt: now,
    updatedAt: now,
  };

  const createdBoard = await createLLDBoard(board);
  response.status(201).json(createdBoard);
});

app.get("/api/lld-boards/:boardId", async (request: Request, response: Response) => {
  const board = await findLLDBoardById(request.params.boardId);

  if (!board) {
    response.status(404).json({ message: "LLD board not found" });
    return;
  }

  response.json(board);
});

app.patch("/api/lld-boards/:boardId", async (request: Request, response: Response) => {
  const currentBoard = await findLLDBoardById(request.params.boardId);

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

  const updatedBoard = await updateLLDBoard(nextBoard);
  response.json(updatedBoard);
});

app.post("/api/ai/analyze/hld", async (request: Request, response: Response) => {
  const graph = request.body as BoardGraph;
  const errors = validateBoardGraph(graph);

  if (errors.length > 0) {
    response.status(400).json({ errors });
    return;
  }

  response.json(await analyzeHLDWithAI(graph));
});

app.post("/api/ai/analyze/lld", async (request: Request, response: Response) => {
  const graph = request.body as LLDGraph;
  const errors = validateLLDGraph(graph);

  if (errors.length > 0) {
    response.status(400).json({ errors });
    return;
  }

  response.json(await analyzeLLDWithAI(graph));
});

app.post("/api/architecture/cleanup", (request: Request, response: Response) => {
  const graph = request.body as BoardGraph;
  const errors = validateBoardGraph(graph);

  if (errors.length > 0) {
    response.status(400).json({ errors });
    return;
  }

  response.json(cleanupArchitectureLayout(graph));
});

async function bootstrap(): Promise<void> {
  if (!env.mongoUri) {
    throw new Error("MONGO_URI is required");
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
