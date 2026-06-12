import type { Board, BoardSummary } from "../../types/board.js";

import { BoardModel } from "./board.schema.js";

export async function createBoard(board: Board): Promise<Board> {
  const document = await BoardModel.create(board);
  return toBoard(document.toObject());
}

export async function findBoardById(
  boardId: string,
  ownerId: string,
): Promise<Board | null> {
  const document = await BoardModel.findOne({ id: boardId, ownerId }).lean();
  return document ? toBoard(document) : null;
}

export async function listRecentBoards(
  ownerId: string,
  limit = 8,
): Promise<BoardSummary[]> {
  const documents = await BoardModel.find({ ownerId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select({ _id: 0, id: 1, name: 1, updatedAt: 1 })
    .lean();

  return documents.map((document) => ({
    id: document.id,
    name: document.name,
    updatedAt: document.updatedAt,
  }));
}

export async function updateBoard(
  board: Board,
  ownerId: string,
): Promise<Board | null> {
  const document = await BoardModel.findOneAndUpdate(
    { id: board.id, ownerId },
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
