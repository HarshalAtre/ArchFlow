import { randomBytes } from "node:crypto";

import { Router } from "express";

import { env } from "../../config/env.js";
import { asyncHandler } from "../../http/async-handler.js";
import {
  authUserFromResponse,
  requireAuth,
} from "../auth/auth.middleware.js";
import {
  addBoardCollaborator,
  findBoardByShareToken,
  findOwnedBoardById,
  setBoardShareToken,
} from "../boards/board.repository.js";
import {
  addLLDBoardCollaborator,
  findLLDBoardByShareToken,
  findOwnedLLDBoardById,
  setLLDBoardShareToken,
} from "../lld-boards/lld-board.repository.js";

type ShareMode = "hld" | "lld";

export const sharingRouter = Router();

sharingRouter.post(
  "/:mode/:boardId",
  requireAuth,
  asyncHandler(async (request, response) => {
    const mode = parseMode(request.params.mode);

    if (!mode) {
      response.status(400).json({ message: "Unknown board type." });
      return;
    }

    const user = authUserFromResponse(response);
    const board =
      mode === "hld"
        ? await findOwnedBoardById(request.params.boardId, user.id)
        : await findOwnedLLDBoardById(request.params.boardId, user.id);

    if (!board) {
      response.status(403).json({
        message: "Only the board owner can create a share link.",
      });
      return;
    }

    const token = board.shareToken || createShareToken(mode);

    if (!board.shareToken) {
      if (mode === "hld") {
        await setBoardShareToken(board.id, user.id, token);
      } else {
        await setLLDBoardShareToken(board.id, user.id, token);
      }
    }

    response.json({
      shareUrl: `${env.webOrigin}/?share=${encodeURIComponent(token)}`,
    });
  }),
);

sharingRouter.post(
  "/accept",
  requireAuth,
  asyncHandler(async (request, response) => {
    const token =
      typeof request.body?.token === "string" ? request.body.token.trim() : "";
    const mode = modeFromShareToken(token);

    if (!mode) {
      response.status(400).json({ message: "This share link is invalid." });
      return;
    }

    const user = authUserFromResponse(response);

    if (mode === "hld") {
      const board = await findBoardByShareToken(token);

      if (!board) {
        response.status(404).json({ message: "This share link has expired." });
        return;
      }

      if (board.ownerId !== user.id) {
        await addBoardCollaborator(board.id, user.id);
      }

      response.json({ boardId: board.id, mode, name: board.name });
      return;
    }

    const board = await findLLDBoardByShareToken(token);

    if (!board) {
      response.status(404).json({ message: "This share link has expired." });
      return;
    }

    if (board.ownerId !== user.id) {
      await addLLDBoardCollaborator(board.id, user.id);
    }

    response.json({ boardId: board.id, mode, name: board.name });
  }),
);

export function createShareToken(mode: ShareMode): string {
  return `${mode}_${randomBytes(24).toString("base64url")}`;
}

export function modeFromShareToken(token: string): ShareMode | null {
  if (token.startsWith("hld_")) {
    return "hld";
  }

  if (token.startsWith("lld_")) {
    return "lld";
  }

  return null;
}

function parseMode(value: string): ShareMode | null {
  return value === "hld" || value === "lld" ? value : null;
}
