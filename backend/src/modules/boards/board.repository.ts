import type { Board, BoardSummary } from "../../types/board.js";

import { BoardModel } from "./board.schema.js";

export async function createBoard(board: Board): Promise<Board> {
  const document = await BoardModel.create(board);
  return toBoard(document.toObject());
}

export async function findBoardById(
  boardId: string,
  userId: string,
): Promise<Board | null> {
  const document = await BoardModel.findOne({
    id: boardId,
    ...accessFilterForUser(userId),
  }).lean();
  return document ? toBoard(document) : null;
}

export async function listRecentBoards(
  userId: string,
  limit = 8,
): Promise<BoardSummary[]> {
  const documents = await BoardModel.find(accessFilterForUser(userId))
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select({ _id: 0, id: 1, name: 1, ownerId: 1, updatedAt: 1 })
    .lean();

  return documents.map((document) => ({
    id: document.id,
    name: document.name,
    ownerId: document.ownerId,
    updatedAt: document.updatedAt,
  }));
}

export async function updateBoard(
  board: Board,
  userId: string,
): Promise<Board | null> {
  const document = await BoardModel.findOneAndUpdate(
    { id: board.id, ...accessFilterForUser(userId) },
    { $set: board },
    { new: true },
  ).lean();

  return document ? toBoard(document) : null;
}

export async function findOwnedBoardById(
  boardId: string,
  ownerId: string,
): Promise<Board | null> {
  const document = await BoardModel.findOne({ id: boardId, ownerId }).lean();
  return document ? toBoard(document) : null;
}

export async function findBoardByShareToken(
  shareToken: string,
): Promise<Board | null> {
  const document = await BoardModel.findOne({ shareToken }).lean();
  return document ? toBoard(document) : null;
}

export async function setBoardShareToken(
  boardId: string,
  ownerId: string,
  shareToken: string,
): Promise<Board | null> {
  const document = await BoardModel.findOneAndUpdate(
    { id: boardId, ownerId },
    { $set: { shareToken } },
    { new: true },
  ).lean();

  return document ? toBoard(document) : null;
}

export async function addBoardCollaborator(
  boardId: string,
  userId: string,
): Promise<Board | null> {
  const document = await BoardModel.findOneAndUpdate(
    { id: boardId },
    { $addToSet: { collaboratorIds: userId } },
    { new: true },
  ).lean();

  return document ? toBoard(document) : null;
}

export async function persistBoardGraph(
  boardId: string,
  userId: string,
  graph: Pick<Board, "elements" | "edges">,
): Promise<boolean> {
  const result = await BoardModel.updateOne(
    { id: boardId, ...accessFilterForUser(userId) },
    {
      $set: {
        ...graph,
        updatedAt: new Date().toISOString(),
      },
    },
  );

  return result.matchedCount > 0;
}

export function accessFilterForUser(userId: string) {
  return {
    $or: [{ ownerId: userId }, { collaboratorIds: userId }],
  };
}

function toBoard(document: Board & { _id?: unknown }): Board {
  return {
    id: document.id,
    name: document.name,
    ownerId: document.ownerId,
    collaboratorIds: document.collaboratorIds ?? [],
    shareToken: document.shareToken,
    elements: document.elements,
    edges: document.edges,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
