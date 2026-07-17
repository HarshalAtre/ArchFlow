import { Router } from "express";

import { asyncHandler } from "../../http/async-handler.js";
import type { BoardGraph } from "../../types/board.js";
import type { CollaborationMode } from "../../types/collaboration.js";
import type { LLDGraph } from "../../types/lld.js";
import {
  authUserFromResponse,
  requireAuth,
} from "../auth/auth.middleware.js";
import {
  findBoardById,
  persistBoardGraph,
} from "../boards/board.repository.js";
import {
  findLLDBoardById,
  persistLLDGraph,
} from "../lld-boards/lld-board.repository.js";

import {
  findBoardVersion,
  listBoardVersions,
  recordBoardVersion,
} from "./version.repository.js";

export const versionRouter = Router();

versionRouter.get(
  "/:mode/:boardId",
  requireAuth,
  asyncHandler(async (request, response) => {
    const mode = parseMode(request.params.mode);
    const user = authUserFromResponse(response);

    if (!mode || !(await canAccess(mode, request.params.boardId, user.id))) {
      response.status(404).json({ message: "Board not found." });
      return;
    }

    const page = parsePositiveInteger(request.query.page, 1);
    const pageSize = Math.min(parsePositiveInteger(request.query.pageSize, 5), 20);
    const result = await listBoardVersions(mode, request.params.boardId, {
      limit: pageSize,
      skip: (page - 1) * pageSize,
    });

    response.json({
      versions: result.versions,
      pagination: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
      },
    });
  }),
);

versionRouter.post(
  "/:mode/:boardId/:versionId/restore",
  requireAuth,
  asyncHandler(async (request, response) => {
    const mode = parseMode(request.params.mode);
    const user = authUserFromResponse(response);

    if (!mode) {
      response.status(400).json({ message: "Unknown board type." });
      return;
    }

    const board =
      mode === "hld"
        ? await findBoardById(request.params.boardId, user.id)
        : await findLLDBoardById(request.params.boardId, user.id);

    if (!board) {
      response.status(404).json({ message: "Board not found." });
      return;
    }

    if (board.accessRole === "viewer") {
      response.status(403).json({ message: "Viewers cannot restore versions." });
      return;
    }

    const version = await findBoardVersion(
      mode,
      request.params.boardId,
      request.params.versionId,
    );

    if (!version) {
      response.status(404).json({ message: "Version not found." });
      return;
    }

    const restored =
      mode === "hld"
        ? await persistBoardGraph(board.id, user.id, version.graph as BoardGraph)
        : await persistLLDGraph(board.id, user.id, version.graph as LLDGraph);

    if (!restored) {
      response.status(409).json({ message: "The version could not be restored." });
      return;
    }

    await recordBoardVersion({
      action: "restored",
      actorId: user.id,
      actorName: user.name,
      boardId: board.id,
      graph: version.graph,
      mode,
    });

    response.json({ graph: version.graph });
  }),
);

async function canAccess(
  mode: CollaborationMode,
  boardId: string,
  userId: string,
): Promise<boolean> {
  return Boolean(
    mode === "hld"
      ? await findBoardById(boardId, userId)
      : await findLLDBoardById(boardId, userId),
  );
}

function parseMode(value: string): CollaborationMode | null {
  return value === "hld" || value === "lld" ? value : null;
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
