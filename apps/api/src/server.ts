import { randomUUID } from "node:crypto";

import { analyzeArchitecture, cleanupArchitectureLayout } from "@visual-arch-board/architecture-engine";
import { validateBoardGraph } from "@visual-arch-board/board-core";
import type { Board, BoardGraph } from "@visual-arch-board/shared";
import cors from "cors";
import express, { Request, Response } from "express";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

const boards = new Map<string, Board>();

app.use(
  cors({
    origin: webOrigin,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request: Request, response: Response) => {
  response.json({
    ok: true,
    service: "visual-arch-board-api",
  });
});

app.post("/api/boards", (request: Request, response: Response) => {
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

  boards.set(board.id, board);
  response.status(201).json(board);
});

app.get("/api/boards/:boardId", (request: Request, response: Response) => {
  const board = boards.get(request.params.boardId);

  if (!board) {
    response.status(404).json({ message: "Board not found" });
    return;
  }

  response.json(board);
});

app.patch("/api/boards/:boardId", (request: Request, response: Response) => {
  const currentBoard = boards.get(request.params.boardId);

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

  boards.set(nextBoard.id, nextBoard);
  response.json(nextBoard);
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

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
