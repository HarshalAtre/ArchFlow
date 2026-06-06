import { randomUUID } from "node:crypto";

import { analyzeArchitecture, cleanupArchitectureLayout } from "@visual-arch-board/architecture-engine";
import { validateBoardGraph } from "@visual-arch-board/board-core";
import type { Board, BoardGraph } from "@visual-arch-board/shared";
import cors from "cors";
import express, { Request, Response } from "express";

import { createBoard, findBoardById, updateBoard } from "./modules/boards/board.repository.js";
import { env } from "./shared/config/env.js";
import { connectToMongo } from "./shared/database/mongo.js";

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

app.post("/api/architecture/analyze", (request: Request, response: Response) => {
  const graph = request.body as BoardGraph;
  const errors = validateBoardGraph(graph);

  if (errors.length > 0) {
    response.status(400).json({ errors });
    return;
  }

  response.json({
    suggestions: analyzeArchitecture(graph),
  });
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
