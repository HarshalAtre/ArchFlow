import type {
  Board,
  BoardAccessRole,
  BoardSummary,
} from "../../types/board.js";

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
  return document ? toBoard(document, userId) : null;
}

export async function listRecentBoards(
  userId: string,
  limit = 8,
): Promise<BoardSummary[]> {
  const documents = await BoardModel.find(accessFilterForUser(userId))
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select({
      _id: 0,
      id: 1,
      name: 1,
      ownerId: 1,
      collaboratorIds: 1,
      viewerIds: 1,
      updatedAt: 1,
    })
    .lean();

  return documents.map((document) => ({
    id: document.id,
    name: document.name,
    ownerId: document.ownerId,
    updatedAt: document.updatedAt,
    accessRole: accessRoleForBoard(document as Board, userId),
  }));
}

export async function updateBoard(
  board: Board,
  userId: string,
): Promise<Board | null> {
  const document = await BoardModel.findOneAndUpdate(
    { id: board.id, ...editFilterForUser(userId) },
    { $set: board },
    { new: true },
  ).lean();

  return document ? toBoard(document, userId) : null;
}

export async function deleteOwnedBoard(
  boardId: string,
  ownerId: string,
): Promise<boolean> {
  const result = await BoardModel.deleteOne({ id: boardId, ownerId });
  return result.deletedCount > 0;
}

export async function leaveBoard(
  boardId: string,
  userId: string,
): Promise<boolean> {
  const result = await BoardModel.updateOne(
    {
      id: boardId,
      ownerId: { $ne: userId },
      $or: [{ collaboratorIds: userId }, { viewerIds: userId }],
    },
    { $pull: { collaboratorIds: userId, viewerIds: userId } },
  );
  return result.matchedCount > 0;
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
  shareRole: "editor" | "viewer",
): Promise<Board | null> {
  const document = await BoardModel.findOneAndUpdate(
    { id: boardId, ownerId },
    { $set: { shareToken, shareRole } },
    { new: true },
  ).lean();

  return document ? toBoard(document) : null;
}

export async function addBoardCollaborator(
  boardId: string,
  userId: string,
  role: "editor" | "viewer",
): Promise<Board | null> {
  const document = await BoardModel.findOneAndUpdate(
    { id: boardId },
    role === "editor"
      ? {
          $addToSet: { collaboratorIds: userId },
          $pull: { viewerIds: userId },
        }
      : {
          $addToSet: { viewerIds: userId },
          $pull: { collaboratorIds: userId },
        },
    { new: true },
  ).lean();

  return document ? toBoard(document) : null;
}

export async function revokeBoardShareToken(
  boardId: string,
  ownerId: string,
): Promise<boolean> {
  const result = await BoardModel.updateOne(
    { id: boardId, ownerId },
    { $unset: { shareToken: 1, shareRole: 1 } },
  );
  return result.matchedCount > 0;
}

export async function removeBoardCollaborator(
  boardId: string,
  ownerId: string,
  userId: string,
): Promise<boolean> {
  const result = await BoardModel.updateOne(
    { id: boardId, ownerId },
    { $pull: { collaboratorIds: userId, viewerIds: userId } },
  );
  return result.matchedCount > 0;
}

export async function setBoardCollaboratorRole(
  boardId: string,
  ownerId: string,
  userId: string,
  role: "editor" | "viewer",
): Promise<boolean> {
  const update =
    role === "editor"
      ? {
          $addToSet: { collaboratorIds: userId },
          $pull: { viewerIds: userId },
        }
      : {
          $addToSet: { viewerIds: userId },
          $pull: { collaboratorIds: userId },
        };
  const result = await BoardModel.updateOne({ id: boardId, ownerId }, update);
  return result.matchedCount > 0;
}

export async function persistBoardGraph(
  boardId: string,
  userId: string,
  graph: Pick<Board, "elements" | "edges">,
): Promise<boolean> {
  const result = await BoardModel.updateOne(
    { id: boardId, ...editFilterForUser(userId) },
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
    $or: [
      { ownerId: userId },
      { collaboratorIds: userId },
      { viewerIds: userId },
    ],
  };
}

export function editFilterForUser(userId: string) {
  return {
    $or: [{ ownerId: userId }, { collaboratorIds: userId }],
  };
}

export function accessRoleForBoard(
  board: Pick<Board, "ownerId" | "collaboratorIds" | "viewerIds">,
  userId: string,
): BoardAccessRole {
  if (board.ownerId === userId) {
    return "owner";
  }
  return board.collaboratorIds?.includes(userId) ? "editor" : "viewer";
}

function toBoard(document: Board & { _id?: unknown }, userId?: string): Board {
  return {
    id: document.id,
    name: document.name,
    ownerId: document.ownerId,
    collaboratorIds: document.collaboratorIds ?? [],
    viewerIds: document.viewerIds ?? [],
    shareToken: document.shareToken,
    shareRole: document.shareRole,
    accessRole: userId ? accessRoleForBoard(document, userId) : document.accessRole,
    elements: document.elements,
    edges: document.edges,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
