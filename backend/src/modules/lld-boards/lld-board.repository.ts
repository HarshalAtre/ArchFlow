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
  return document ? toLLDBoard(document) : null;
}

export async function listRecentLLDBoards(
  userId: string,
  limit = 8,
): Promise<LLDBoardSummary[]> {
  const documents = await LLDBoardModel.find(lldAccessFilterForUser(userId))
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

export async function updateLLDBoard(
  board: LLDBoard,
  userId: string,
): Promise<LLDBoard | null> {
  const document = await LLDBoardModel.findOneAndUpdate(
    { id: board.id, ...lldAccessFilterForUser(userId) },
    { $set: board },
    { new: true },
  ).lean();

  return document ? toLLDBoard(document) : null;
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
): Promise<LLDBoard | null> {
  const document = await LLDBoardModel.findOneAndUpdate(
    { id: boardId, ownerId },
    { $set: { shareToken } },
    { new: true },
  ).lean();

  return document ? toLLDBoard(document) : null;
}

export async function addLLDBoardCollaborator(
  boardId: string,
  userId: string,
): Promise<LLDBoard | null> {
  const document = await LLDBoardModel.findOneAndUpdate(
    { id: boardId },
    { $addToSet: { collaboratorIds: userId } },
    { new: true },
  ).lean();

  return document ? toLLDBoard(document) : null;
}

export async function persistLLDGraph(
  boardId: string,
  userId: string,
  graph: Pick<LLDBoard, "classes" | "relationships">,
): Promise<boolean> {
  const result = await LLDBoardModel.updateOne(
    { id: boardId, ...lldAccessFilterForUser(userId) },
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
    $or: [{ ownerId: userId }, { collaboratorIds: userId }],
  };
}

function toLLDBoard(document: LLDBoard & { _id?: unknown }): LLDBoard {
  return {
    id: document.id,
    name: document.name,
    ownerId: document.ownerId,
    collaboratorIds: document.collaboratorIds ?? [],
    shareToken: document.shareToken,
    classes: document.classes,
    relationships: document.relationships,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
