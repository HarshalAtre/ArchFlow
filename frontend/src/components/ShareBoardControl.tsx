import { useEffect, useState } from "react";
import { Copy, Share2, UsersRound } from "lucide-react";

import {
  changeCollaboratorRole,
  getCollaborationAccess,
  removeCollaborator,
  revokeShareLink,
  type Collaborator,
  type ShareMode,
  type ShareRole,
} from "../services/sharingApi";

type ShareBoardControlProps = {
  boardId: string | null;
  mode: ShareMode;
  onCreateLink: (
    role: ShareRole,
  ) => Promise<{ boardId: string; shareUrl: string }>;
};

export function ShareBoardControl({
  boardId,
  mode,
  onCreateLink,
}: ShareBoardControlProps) {
  const [activeBoardId, setActiveBoardId] = useState(boardId);
  const [shareUrl, setShareUrl] = useState("");
  const [role, setRole] = useState<ShareRole>("editor");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setActiveBoardId(boardId);
    if (expanded && boardId) {
      void refreshAccess(boardId);
    }
  }, [boardId, expanded, mode]);

  async function refreshAccess(id = activeBoardId) {
    if (!id) {
      return;
    }
    try {
      const access = await getCollaborationAccess(mode, id);
      setCollaborators(access.collaborators);
      if (access.linkRole) {
        setRole(access.linkRole);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load access.");
    }
  }

  async function handleCreateLink() {
    setLoading(true);
    setStatus("");

    try {
      const result = await onCreateLink(role);
      setActiveBoardId(result.boardId);
      setShareUrl(result.shareUrl);
      await copyShareUrl(result.shareUrl);
      setStatus(`${role === "editor" ? "Editor" : "Viewer"} link copied`);
      await refreshAccess(result.boardId);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not create share link",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (!activeBoardId) {
      return;
    }
    try {
      await revokeShareLink(mode, activeBoardId);
      setShareUrl("");
      setStatus("Share link revoked");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not revoke link.");
    }
  }

  async function updateRole(collaborator: Collaborator, nextRole: ShareRole) {
    if (!activeBoardId) {
      return;
    }
    try {
      await changeCollaboratorRole(mode, activeBoardId, collaborator.id, nextRole);
      await refreshAccess();
      setStatus(`${collaborator.name} is now a ${nextRole}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not change role.");
    }
  }

  async function remove(collaborator: Collaborator) {
    if (!activeBoardId) {
      return;
    }
    try {
      await removeCollaborator(mode, activeBoardId, collaborator.id);
      await refreshAccess();
      setStatus(`${collaborator.name} removed`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not remove access.");
    }
  }

  return (
    <div className="share-control">
      <div className="share-action-row">
        <select
          aria-label="Share access role"
          className="text-input"
          value={role}
          onChange={(event) => setRole(event.target.value as ShareRole)}
        >
          <option value="editor">Can edit</option>
          <option value="viewer">View only</option>
        </select>
        <button className="command-button" type="button" disabled={loading} onClick={handleCreateLink}>
          <Share2 aria-hidden="true" size={16} />
          {loading ? "Creating..." : "Share Board"}
        </button>
      </div>
      {shareUrl ? (
        <div className="share-link-row">
          <input
            aria-label="Board share link"
            className="text-input"
            readOnly
            value={shareUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
          <button className="command-button" type="button" onClick={() => void copyShareUrl(shareUrl)}>
            <Copy aria-hidden="true" size={16} />
            Copy
          </button>
        </div>
      ) : null}
      {activeBoardId ? (
        <button
          type="button"
          className="command-button"
          onClick={() => setExpanded((value) => !value)}
        >
          <UsersRound aria-hidden="true" size={16} />
          {expanded ? "Hide Access" : "Manage Access"}
        </button>
      ) : null}
      {expanded ? (
        <div className="collaborator-list">
          <button type="button" className="danger-button" onClick={() => void handleRevoke()}>
            Revoke Link
          </button>
          {collaborators.map((collaborator) => (
            <article key={collaborator.id} className="collaborator-row">
              <div>
                <strong>{collaborator.name}</strong>
                <small>{collaborator.email}</small>
              </div>
              <select
                className="text-input"
                value={collaborator.role}
                onChange={(event) =>
                  void updateRole(
                    collaborator,
                    event.target.value as ShareRole,
                  )
                }
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                type="button"
                className="danger-button"
                onClick={() => void remove(collaborator)}
              >
                Remove
              </button>
            </article>
          ))}
          {collaborators.length === 0 ? (
            <p className="status-text">No collaborators have joined yet.</p>
          ) : null}
        </div>
      ) : null}
      {status ? <p className="status-text">{status}</p> : null}
    </div>
  );
}

async function copyShareUrl(shareUrl: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error("Clipboard access is unavailable.");
  }
  await navigator.clipboard.writeText(shareUrl);
}
