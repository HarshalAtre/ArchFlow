import { randomUUID } from "node:crypto";

import type { CollaborationGraph, CollaborationMode } from "../../types/collaboration.js";
import type {
  BoardVersion,
  BoardVersionAction,
  BoardVersionSummary,
} from "../../types/version.js";

import { BoardVersionModel } from "./version.schema.js";

const retainedVersionCount = 50;

export async function recordBoardVersion(input: {
  action: BoardVersionAction;
  actorId: string;
  actorName: string;
  boardId: string;
  graph: CollaborationGraph;
  mode: CollaborationMode;
}): Promise<void> {
  await BoardVersionModel.create({
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  });

  const staleVersions = await BoardVersionModel.find({
    boardId: input.boardId,
    mode: input.mode,
  })
    .sort({ createdAt: -1 })
    .skip(retainedVersionCount)
    .select({ _id: 1 })
    .lean();

  if (staleVersions.length > 0) {
    await BoardVersionModel.deleteMany({
      _id: { $in: staleVersions.map((version) => version._id) },
    });
  }
}

export async function listBoardVersions(
  mode: CollaborationMode,
  boardId: string,
): Promise<BoardVersionSummary[]> {
  const versions = await BoardVersionModel.find({ mode, boardId })
    .sort({ createdAt: -1 })
    .limit(retainedVersionCount)
    .select({ graph: 0, _id: 0 })
    .lean();

  return versions as BoardVersionSummary[];
}

export async function findBoardVersion(
  mode: CollaborationMode,
  boardId: string,
  versionId: string,
): Promise<BoardVersion | null> {
  const version = await BoardVersionModel.findOne({
    id: versionId,
    mode,
    boardId,
  }).lean();
  return version as BoardVersion | null;
}
