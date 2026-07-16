const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type ShareMode = "hld" | "lld";
export type ShareRole = "editor" | "viewer";

export type Collaborator = {
  id: string;
  name: string;
  email: string;
  role: ShareRole;
};

export type CollaborationAccess = {
  collaborators: Collaborator[];
  linkActive: boolean;
  linkRole: ShareRole | null;
};

export type AcceptedShare = {
  boardId: string;
  mode: ShareMode;
  name: string;
};

export async function createShareLink(
  mode: ShareMode,
  boardId: string,
  role: ShareRole,
): Promise<string> {
  const response = await fetch(`${API_URL}/api/shares/${mode}/${boardId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  const body = await parseResponse(response);

  if (typeof body.shareUrl !== "string") {
    throw new Error("The server did not return a share link.");
  }

  return body.shareUrl;
}

export async function getCollaborationAccess(
  mode: ShareMode,
  boardId: string,
): Promise<CollaborationAccess> {
  const response = await fetch(
    `${API_URL}/api/shares/${mode}/${boardId}/collaborators`,
    { credentials: "include" },
  );
  return (await parseResponse(response)) as unknown as CollaborationAccess;
}

export async function revokeShareLink(
  mode: ShareMode,
  boardId: string,
): Promise<void> {
  await emptyResponse(
    fetch(`${API_URL}/api/shares/${mode}/${boardId}`, {
      method: "DELETE",
      credentials: "include",
    }),
  );
}

export async function changeCollaboratorRole(
  mode: ShareMode,
  boardId: string,
  userId: string,
  role: ShareRole,
): Promise<void> {
  await emptyResponse(
    fetch(
      `${API_URL}/api/shares/${mode}/${boardId}/collaborators/${userId}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      },
    ),
  );
}

export async function removeCollaborator(
  mode: ShareMode,
  boardId: string,
  userId: string,
): Promise<void> {
  await emptyResponse(
    fetch(
      `${API_URL}/api/shares/${mode}/${boardId}/collaborators/${userId}`,
      { method: "DELETE", credentials: "include" },
    ),
  );
}

export async function acceptShareLink(token: string): Promise<AcceptedShare> {
  const response = await fetch(`${API_URL}/api/shares/accept`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  return (await parseResponse(response)) as AcceptedShare;
}

async function parseResponse(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof body?.message === "string"
        ? body.message
        : "Board sharing request failed.",
    );
  }

  return body as Record<string, unknown>;
}

async function emptyResponse(responsePromise: Promise<Response>): Promise<void> {
  const response = await responsePromise;

  if (!response.ok) {
    await parseResponse(response);
  }
}
