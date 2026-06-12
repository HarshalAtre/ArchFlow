import type { LldBoard, LldDraft, RecentLldBoard } from "../types/lld";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type SaveLldBoardPayload = LldDraft & {
  name: string;
};

export async function createLldBoard(payload: SaveLldBoardPayload): Promise<LldBoard> {
  const response = await fetch(`${API_URL}/api/lld-boards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseLldBoardResponse(response);
}

export async function updateLldBoard(
  boardId: string,
  payload: SaveLldBoardPayload,
): Promise<LldBoard> {
  const response = await fetch(`${API_URL}/api/lld-boards/${boardId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseLldBoardResponse(response);
}

export async function getLldBoard(boardId: string): Promise<LldBoard> {
  const response = await fetch(`${API_URL}/api/lld-boards/${boardId}`);
  return parseLldBoardResponse(response);
}

export async function listRecentLldBoards(): Promise<RecentLldBoard[]> {
  const response = await fetch(`${API_URL}/api/lld-boards`);

  if (!response.ok) {
    throw new Error(await errorMessageFor(response, "Could not load recent LLD boards"));
  }

  const result = (await response.json()) as { boards?: RecentLldBoard[] };
  return Array.isArray(result.boards) ? result.boards : [];
}

async function parseLldBoardResponse(response: Response): Promise<LldBoard> {
  if (!response.ok) {
    throw new Error(await errorMessageFor(response, "LLD board request failed"));
  }

  return response.json() as Promise<LldBoard>;
}

async function errorMessageFor(response: Response, fallback: string): Promise<string> {
  const errorBody = await response.json().catch(() => null);

  if (typeof errorBody?.message === "string") {
    return errorBody.message;
  }

  if (Array.isArray(errorBody?.errors) && typeof errorBody.errors[0] === "string") {
    return errorBody.errors[0];
  }

  return fallback;
}
