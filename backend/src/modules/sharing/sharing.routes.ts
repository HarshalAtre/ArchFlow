import { randomBytes } from "node:crypto";

import { Router } from "express";

import { env } from "../../config/env.js";
import { asyncHandler } from "../../http/async-handler.js";
import type { BoardAccessRole } from "../../types/board.js";
import {
  authUserFromResponse,
  requireAuth,
} from "../auth/auth.middleware.js";
import { findUsersByIds } from "../auth/user.repository.js";
import {
  addBoardCollaborator,
  findBoardByShareToken,
  findOwnedBoardById,
  removeBoardCollaborator,
  revokeBoardShareToken,
  setBoardCollaboratorRole,
  setBoardShareToken,
} from "../boards/board.repository.js";
import {
  addLLDBoardCollaborator,
  findLLDBoardByShareToken,
  findOwnedLLDBoardById,
  removeLLDBoardCollaborator,
  revokeLLDBoardShareToken,
  setLLDBoardCollaboratorRole,
  setLLDBoardShareToken,
} from "../lld-boards/lld-board.repository.js";

type ShareMode = "hld" | "lld";
type ShareRole = Exclude<BoardAccessRole, "owner">;

export const sharingRouter = Router();

sharingRouter.post(
  "/:mode/:boardId",
  requireAuth,
  asyncHandler(async (request, response) => {
    const mode = parseMode(request.params.mode);
    const role = parseRole(request.body?.role);

    if (!mode || !role) {
      response.status(400).json({ message: "Choose a valid board type and role." });
      return;
    }

    const user = authUserFromResponse(response);
    const board = await ownedBoard(mode, request.params.boardId, user.id);

    if (!board) {
      response.status(403).json({
        message: "Only the board owner can create a share link.",
      });
      return;
    }

    const token =
      board.shareToken && board.shareRole === role
        ? board.shareToken
        : createShareToken(mode);

    if (mode === "hld") {
      await setBoardShareToken(board.id, user.id, token, role);
    } else {
      await setLLDBoardShareToken(board.id, user.id, token, role);
    }

    response.json({
      role,
      shareUrl: `${env.webOrigin}/?share=${encodeURIComponent(token)}`,
    });
  }),
);

sharingRouter.delete(
  "/:mode/:boardId",
  requireAuth,
  asyncHandler(async (request, response) => {
    const mode = parseMode(request.params.mode);
    const user = authUserFromResponse(response);

    if (!mode) {
      response.status(400).json({ message: "Unknown board type." });
      return;
    }

    const revoked =
      mode === "hld"
        ? await revokeBoardShareToken(request.params.boardId, user.id)
        : await revokeLLDBoardShareToken(request.params.boardId, user.id);

    response.status(revoked ? 204 : 403).end();
  }),
);

sharingRouter.get(
  "/:mode/:boardId/collaborators",
  requireAuth,
  asyncHandler(async (request, response) => {
    const mode = parseMode(request.params.mode);
    const user = authUserFromResponse(response);
    const board = mode
      ? await ownedBoard(mode, request.params.boardId, user.id)
      : null;

    if (!mode || !board) {
      response.status(403).json({ message: "Only the board owner can manage access." });
      return;
    }

    const users = await findUsersByIds([
      ...board.collaboratorIds,
      ...board.viewerIds,
    ]);
    const editorIds = new Set(board.collaboratorIds);

    response.json({
      collaborators: users.map((collaborator) => ({
        id: collaborator.id,
        name: collaborator.name,
        email: collaborator.email,
        role: editorIds.has(collaborator.id) ? "editor" : "viewer",
      })),
      linkRole: board.shareRole ?? null,
      linkActive: Boolean(board.shareToken),
    });
  }),
);

sharingRouter.patch(
  "/:mode/:boardId/collaborators/:userId",
  requireAuth,
  asyncHandler(async (request, response) => {
    const mode = parseMode(request.params.mode);
    const role = parseRole(request.body?.role);
    const owner = authUserFromResponse(response);

    if (!mode || !role) {
      response.status(400).json({ message: "Choose a valid role." });
      return;
    }

    const updated =
      mode === "hld"
        ? await setBoardCollaboratorRole(
            request.params.boardId,
            owner.id,
            request.params.userId,
            role,
          )
        : await setLLDBoardCollaboratorRole(
            request.params.boardId,
            owner.id,
            request.params.userId,
            role,
          );

    response.status(updated ? 204 : 403).end();
  }),
);

sharingRouter.delete(
  "/:mode/:boardId/collaborators/:userId",
  requireAuth,
  asyncHandler(async (request, response) => {
    const mode = parseMode(request.params.mode);
    const owner = authUserFromResponse(response);

    if (!mode) {
      response.status(400).json({ message: "Unknown board type." });
      return;
    }

    const removed =
      mode === "hld"
        ? await removeBoardCollaborator(
            request.params.boardId,
            owner.id,
            request.params.userId,
          )
        : await removeLLDBoardCollaborator(
            request.params.boardId,
            owner.id,
            request.params.userId,
          );

    response.status(removed ? 204 : 403).end();
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
    const board =
      mode === "hld"
        ? await findBoardByShareToken(token)
        : await findLLDBoardByShareToken(token);

    if (!board) {
      response.status(404).json({ message: "This share link has expired." });
      return;
    }

    const role = board.shareRole ?? "editor";

    if (board.ownerId !== user.id) {
      const alreadyEditor = board.collaboratorIds.includes(user.id);

      if (!alreadyEditor || role === "editor") {
        if (mode === "hld") {
          await addBoardCollaborator(board.id, user.id, role);
        } else {
          await addLLDBoardCollaborator(board.id, user.id, role);
        }
      }
    }

    response.json({
      boardId: board.id,
      mode,
      name: board.name,
      role:
        board.ownerId === user.id
          ? "owner"
          : board.collaboratorIds.includes(user.id) || role === "editor"
            ? "editor"
            : "viewer",
    });
  }),
);

async function ownedBoard(mode: ShareMode, boardId: string, ownerId: string) {
  return mode === "hld"
    ? findOwnedBoardById(boardId, ownerId)
    : findOwnedLLDBoardById(boardId, ownerId);
}

export function createShareToken(mode: ShareMode): string {
  return `${mode}_${randomBytes(24).toString("base64url")}`;
}

export function modeFromShareToken(token: string): ShareMode | null {
  if (token.startsWith("hld_")) {
    return "hld";
  }
  return token.startsWith("lld_") ? "lld" : null;
}

function parseMode(value: string): ShareMode | null {
  return value === "hld" || value === "lld" ? value : null;
}

function parseRole(value: unknown): ShareRole | null {
  return value === "editor" || value === "viewer" ? value : null;
}
