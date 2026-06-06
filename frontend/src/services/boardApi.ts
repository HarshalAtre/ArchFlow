import type { Board, BoardGraph } from "../types/board";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type SaveBoardPayload = BoardGraph & {
  name: string;
};

export async function createBoard(payload: SaveBoardPayload): Promise<Board> {
  const response = await fetch(`${API_URL}/api/boards`, {
    method: "POST",
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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseBoardResponse(response);
}

export async function getBoard(boardId: string): Promise<Board> {
  const response = await fetch(`${API_URL}/api/boards/${boardId}`);
  return parseBoardResponse(response);
}

async function parseBoardResponse(response: Response): Promise<Board> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      typeof errorBody?.message === "string"
        ? errorBody.message
        : "Board request failed";

    throw new Error(message);
  }

  return response.json() as Promise<Board>;
}
