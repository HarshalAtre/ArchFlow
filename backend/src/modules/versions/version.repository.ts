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
  options: { limit: number; skip: number },
): Promise<{ total: number; versions: BoardVersionSummary[] }> {
  const query = { mode, boardId };
  const [versions, total] = await Promise.all([
    BoardVersionModel.find(query)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .select({ graph: 0, _id: 0 })
      .lean(),
    BoardVersionModel.countDocuments(query),
  ]);

  return {
    total: Math.min(total, retainedVersionCount),
    versions: versions as BoardVersionSummary[],
  };
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

export async function deleteBoardVersions(
  mode: CollaborationMode,
  boardId: string,
): Promise<void> {
  await BoardVersionModel.deleteMany({ mode, boardId });
}
