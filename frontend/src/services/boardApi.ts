import type { Board, BoardGraph, RecentBoard } from "../types/board";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type SaveBoardPayload = BoardGraph & {
  name: string;
};

export async function createBoard(payload: SaveBoardPayload): Promise<Board> {
  const response = await fetch(`${API_URL}/api/boards`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBoardResponse(response);
}

export async function updateBoard(boardId: string, payload: SaveBoardPayload): Promise<Board> {
  const response = await fetch(`${API_URL}/api/boards/${boardId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBoardResponse(response);
}

export async function duplicateBoard(
  boardId: string,
  name: string,
): Promise<Board> {
  const response = await fetch(`${API_URL}/api/boards/${boardId}/duplicate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseBoardResponse(response);
}

export async function removeBoard(
  boardId: string,
): Promise<"deleted" | "left"> {
  const response = await fetch(`${API_URL}/api/boards/${boardId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseRemovalResponse(response);
}

export async function getBoard(boardId: string): Promise<Board> {
  const response = await fetch(`${API_URL}/api/boards/${boardId}`, {
    credentials: "include",
  });
  return parseBoardResponse(response);
}

export async function listRecentBoards(): Promise<RecentBoard[]> {
  const response = await fetch(`${API_URL}/api/boards`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await errorMessageFor(response, "Could not load recent boards"));
  }

  const result = (await response.json()) as { boards?: RecentBoard[] };
  return Array.isArray(result.boards) ? result.boards : [];
}

async function parseBoardResponse(response: Response): Promise<Board> {
  if (!response.ok) {
    throw new Error(await errorMessageFor(response, "Board request failed"));
  }

  return response.json() as Promise<Board>;
}

async function errorMessageFor(response: Response, fallback: string): Promise<string> {
  const errorBody = await response.json().catch(() => null);

  return typeof errorBody?.message === "string" ? errorBody.message : fallback;
}

async function parseRemovalResponse(
  response: Response,
): Promise<"deleted" | "left"> {
  if (!response.ok) {
    throw new Error(await errorMessageFor(response, "Board removal failed"));
  }

  const body = (await response.json()) as { action?: unknown };
  return body.action === "left" ? "left" : "deleted";
}
