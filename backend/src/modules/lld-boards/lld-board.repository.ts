import type { LLDBoard, LLDBoardSummary } from "../../types/lld.js";

import { LLDBoardModel } from "./lld-board.schema.js";

export async function createLLDBoard(board: LLDBoard): Promise<LLDBoard> {
  const document = await LLDBoardModel.create(board);
  return toLLDBoard(document.toObject());
}

export async function findLLDBoardById(boardId: string): Promise<LLDBoard | null> {
  const document = await LLDBoardModel.findOne({ id: boardId }).lean();
  return document ? toLLDBoard(document) : null;
}

export async function listRecentLLDBoards(
  ownerId: string,
  limit = 8,
): Promise<LLDBoardSummary[]> {
  const documents = await LLDBoardModel.find({ ownerId })
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

export async function updateLLDBoard(board: LLDBoard): Promise<LLDBoard | null> {
  const document = await LLDBoardModel.findOneAndUpdate(
    { id: board.id },
    { $set: board },
    { new: true },
  ).lean();

  return document ? toLLDBoard(document) : null;
}

function toLLDBoard(document: LLDBoard & { _id?: unknown }): LLDBoard {
  return {
    id: document.id,
    name: document.name,
    ownerId: document.ownerId,
    classes: document.classes,
    relationships: document.relationships,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
