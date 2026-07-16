import type { BoardAccessRole } from "../../types/board.js";
import type { LLDBoard, LLDBoardSummary } from "../../types/lld.js";

import { LLDBoardModel } from "./lld-board.schema.js";

export async function createLLDBoard(board: LLDBoard): Promise<LLDBoard> {
  const document = await LLDBoardModel.create(board);
  return toLLDBoard(document.toObject());
}

export async function findLLDBoardById(
  boardId: string,
  userId: string,
): Promise<LLDBoard | null> {
  const document = await LLDBoardModel.findOne({
    id: boardId,
    ...lldAccessFilterForUser(userId),
  }).lean();
  return document ? toLLDBoard(document, userId) : null;
}

export async function listRecentLLDBoards(
  userId: string,
  limit = 8,
): Promise<LLDBoardSummary[]> {
  const documents = await LLDBoardModel.find(lldAccessFilterForUser(userId))
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
    accessRole: accessRoleForLLDBoard(document as LLDBoard, userId),
  }));
}

export async function updateLLDBoard(
  board: LLDBoard,
  userId: string,
): Promise<LLDBoard | null> {
  const document = await LLDBoardModel.findOneAndUpdate(
    { id: board.id, ...lldEditFilterForUser(userId) },
    { $set: board },
    { new: true },
  ).lean();

  return document ? toLLDBoard(document, userId) : null;
}

export async function findOwnedLLDBoardById(
  boardId: string,
  ownerId: string,
): Promise<LLDBoard | null> {
  const document = await LLDBoardModel.findOne({ id: boardId, ownerId }).lean();
  return document ? toLLDBoard(document) : null;
}

export async function findLLDBoardByShareToken(
  shareToken: string,
): Promise<LLDBoard | null> {
  const document = await LLDBoardModel.findOne({ shareToken }).lean();
  return document ? toLLDBoard(document) : null;
}

export async function setLLDBoardShareToken(
  boardId: string,
  ownerId: string,
  shareToken: string,
  shareRole: "editor" | "viewer",
): Promise<LLDBoard | null> {
  const document = await LLDBoardModel.findOneAndUpdate(
    { id: boardId, ownerId },
    { $set: { shareToken, shareRole } },
    { new: true },
  ).lean();

  return document ? toLLDBoard(document) : null;
}

export async function addLLDBoardCollaborator(
  boardId: string,
  userId: string,
  role: "editor" | "viewer",
): Promise<LLDBoard | null> {
  const document = await LLDBoardModel.findOneAndUpdate(
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

  return document ? toLLDBoard(document) : null;
}

export async function revokeLLDBoardShareToken(
  boardId: string,
  ownerId: string,
): Promise<boolean> {
  const result = await LLDBoardModel.updateOne(
    { id: boardId, ownerId },
    { $unset: { shareToken: 1, shareRole: 1 } },
  );
  return result.matchedCount > 0;
}

export async function removeLLDBoardCollaborator(
  boardId: string,
  ownerId: string,
  userId: string,
): Promise<boolean> {
  const result = await LLDBoardModel.updateOne(
    { id: boardId, ownerId },
    { $pull: { collaboratorIds: userId, viewerIds: userId } },
  );
  return result.matchedCount > 0;
}

export async function setLLDBoardCollaboratorRole(
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
  const result = await LLDBoardModel.updateOne(
    { id: boardId, ownerId },
    update,
  );
  return result.matchedCount > 0;
}

export async function persistLLDGraph(
  boardId: string,
  userId: string,
  graph: Pick<LLDBoard, "classes" | "relationships">,
): Promise<boolean> {
  const result = await LLDBoardModel.updateOne(
    { id: boardId, ...lldEditFilterForUser(userId) },
    {
      $set: {
        ...graph,
        updatedAt: new Date().toISOString(),
      },
    },
  );

  return result.matchedCount > 0;
}

export function lldAccessFilterForUser(userId: string) {
  return {
    $or: [
      { ownerId: userId },
      { collaboratorIds: userId },
      { viewerIds: userId },
    ],
  };
}

export function lldEditFilterForUser(userId: string) {
  return {
    $or: [{ ownerId: userId }, { collaboratorIds: userId }],
  };
}

export function accessRoleForLLDBoard(
  board: Pick<LLDBoard, "ownerId" | "collaboratorIds" | "viewerIds">,
  userId: string,
): BoardAccessRole {
  if (board.ownerId === userId) {
    return "owner";
  }
  return board.collaboratorIds?.includes(userId) ? "editor" : "viewer";
}

function toLLDBoard(
  document: LLDBoard & { _id?: unknown },
  userId?: string,
): LLDBoard {
  return {
    id: document.id,
    name: document.name,
    ownerId: document.ownerId,
    collaboratorIds: document.collaboratorIds ?? [],
    viewerIds: document.viewerIds ?? [],
    shareToken: document.shareToken,
    shareRole: document.shareRole,
    accessRole: userId
      ? accessRoleForLLDBoard(document, userId)
      : document.accessRole,
    classes: document.classes,
    relationships: document.relationships,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
