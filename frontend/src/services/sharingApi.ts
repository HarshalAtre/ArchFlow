const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type ShareMode = "hld" | "lld";

export type AcceptedShare = {
  boardId: string;
  mode: ShareMode;
  name: string;
};

export async function createShareLink(
  mode: ShareMode,
  boardId: string,
): Promise<string> {
  const response = await fetch(`${API_URL}/api/shares/${mode}/${boardId}`, {
    method: "POST",
    credentials: "include",
  });
  const body = await parseResponse(response);

  if (typeof body.shareUrl !== "string") {
    throw new Error("The server did not return a share link.");
  }

  return body.shareUrl;
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
