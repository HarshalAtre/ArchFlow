import type { LldBoard, LldBoardSummary } from "../../types/lld.js";

import { LldBoardModel } from "./lld-board.schema.js";

export async function createLldBoard(board: LldBoard): Promise<LldBoard> {
  const document = await LldBoardModel.create(board);
  return toLldBoard(document.toObject());
}

export async function findLldBoardById(boardId: string): Promise<LldBoard | null> {
  const document = await LldBoardModel.findOne({ id: boardId }).lean();
  return document ? toLldBoard(document) : null;
}

export async function listRecentLldBoards(
  ownerId: string,
  limit = 8,
): Promise<LldBoardSummary[]> {
  const documents = await LldBoardModel.find({ ownerId })
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

export async function updateLldBoard(board: LldBoard): Promise<LldBoard | null> {
  const document = await LldBoardModel.findOneAndUpdate(
    { id: board.id },
    { $set: board },
    { new: true },
  ).lean();

  return document ? toLldBoard(document) : null;
}

function toLldBoard(document: LldBoard & { _id?: unknown }): LldBoard {
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
