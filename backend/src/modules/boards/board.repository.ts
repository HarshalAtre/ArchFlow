import type { Board } from "../../types/board.js";

import { BoardModel } from "./board.schema.js";

export async function createBoard(board: Board): Promise<Board> {
  const document = await BoardModel.create(board);
  return toBoard(document.toObject());
}

export async function findBoardById(boardId: string): Promise<Board | null> {
  const document = await BoardModel.findOne({ id: boardId }).lean();
  return document ? toBoard(document) : null;
}

export async function updateBoard(board: Board): Promise<Board | null> {
  const document = await BoardModel.findOneAndUpdate(
    { id: board.id },
    { $set: board },
    { new: true },
  ).lean();

  return document ? toBoard(document) : null;
}

function toBoard(document: Board & { _id?: unknown }): Board {
  return {
    id: document.id,
    name: document.name,
    ownerId: document.ownerId,
    elements: document.elements,
    edges: document.edges,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
