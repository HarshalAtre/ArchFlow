import type {
  CollaborationGraph,
  CollaborationMode,
} from "../types/collaboration";
import type { BoardVersion } from "../types/version";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function listBoardVersions(
  mode: CollaborationMode,
  boardId: string,
  page: number,
  pageSize = 5,
): Promise<{ page: number; total: number; totalPages: number; versions: BoardVersion[] }> {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await fetch(
    `${API_URL}/api/versions/${mode}/${boardId}?${query.toString()}`,
    { credentials: "include" },
  );
  const body = await parseResponse(response);
  const pagination = body.pagination as Record<string, unknown> | undefined;

  return {
    page: typeof pagination?.page === "number" ? pagination.page : page,
    total: typeof pagination?.total === "number" ? pagination.total : 0,
    totalPages:
      typeof pagination?.totalPages === "number" ? pagination.totalPages : 1,
    versions: Array.isArray(body.versions) ? (body.versions as BoardVersion[]) : [],
  };
}

export async function restoreBoardVersion(
  mode: CollaborationMode,
  boardId: string,
  versionId: string,
): Promise<CollaborationGraph> {
  const response = await fetch(
    `${API_URL}/api/versions/${mode}/${boardId}/${versionId}/restore`,
    { method: "POST", credentials: "include" },
  );
  const body = await parseResponse(response);
  return body.graph as CollaborationGraph;
}

async function parseResponse(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof body?.message === "string" ? body.message : "Version request failed.",
    );
  }

  return body as Record<string, unknown>;
}
