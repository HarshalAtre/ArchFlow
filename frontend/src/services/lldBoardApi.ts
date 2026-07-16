import type { LLDBoard, LLDDraft, RecentLLDBoard } from "../types/lld";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type SaveLLDBoardPayload = LLDDraft & {
  name: string;
};

export async function createLLDBoard(payload: SaveLLDBoardPayload): Promise<LLDBoard> {
  const response = await fetch(`${API_URL}/api/lld-boards`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseLLDBoardResponse(response);
}

export async function updateLLDBoard(
  boardId: string,
  payload: SaveLLDBoardPayload,
): Promise<LLDBoard> {
  const response = await fetch(`${API_URL}/api/lld-boards/${boardId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseLLDBoardResponse(response);
}

export async function duplicateLLDBoard(
  boardId: string,
  name: string,
): Promise<LLDBoard> {
  const response = await fetch(
    `${API_URL}/api/lld-boards/${boardId}/duplicate`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    },
  );
  return parseLLDBoardResponse(response);
}

export async function removeLLDBoard(
  boardId: string,
): Promise<"deleted" | "left"> {
  const response = await fetch(`${API_URL}/api/lld-boards/${boardId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await errorMessageFor(response, "LLD board removal failed"));
  }

  const body = (await response.json()) as { action?: unknown };
  return body.action === "left" ? "left" : "deleted";
}

export async function getLLDBoard(boardId: string): Promise<LLDBoard> {
  const response = await fetch(`${API_URL}/api/lld-boards/${boardId}`, {
    credentials: "include",
  });
  return parseLLDBoardResponse(response);
}

export async function listRecentLLDBoards(): Promise<RecentLLDBoard[]> {
  const response = await fetch(`${API_URL}/api/lld-boards`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await errorMessageFor(response, "Could not load recent LLD boards"));
  }

  const result = (await response.json()) as { boards?: RecentLLDBoard[] };
  return Array.isArray(result.boards) ? result.boards : [];
}

async function parseLLDBoardResponse(response: Response): Promise<LLDBoard> {
  if (!response.ok) {
    throw new Error(await errorMessageFor(response, "LLD board request failed"));
  }

  return response.json() as Promise<LLDBoard>;
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
