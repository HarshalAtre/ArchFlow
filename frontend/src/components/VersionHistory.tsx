import { useEffect, useState } from "react";
import { History } from "lucide-react";

import { listBoardVersions, restoreBoardVersion } from "../services/versionApi";
import type {
  CollaborationGraph,
  CollaborationMode,
} from "../types/collaboration";
import type { BoardVersion } from "../types/version";

type VersionHistoryProps = {
  boardId: string | null;
  canRestore: boolean;
  mode: CollaborationMode;
  onRestore: (graph: CollaborationGraph) => void;
};

export function VersionHistory({
  boardId,
  canRestore,
  mode,
  onRestore,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<BoardVersion[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!expanded || !boardId) {
      return;
    }
    void refresh();
  }, [boardId, expanded, mode]);

  async function refresh() {
    if (!boardId) {
      return;
    }
    try {
      setVersions(await listBoardVersions(mode, boardId));
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load history.");
    }
  }

  async function restore(versionId: string) {
    if (!boardId) {
      return;
    }
    try {
      const graph = await restoreBoardVersion(mode, boardId, versionId);
      onRestore(graph);
      await refresh();
      setStatus("Version restored");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Restore failed.");
    }
  }

  if (!boardId) {
    return null;
  }

  return (
    <div className="version-history">
      <button className="command-button" type="button" onClick={() => setExpanded((value) => !value)}>
        <History aria-hidden="true" size={16} />
        {expanded ? "Hide History" : "Version History"}
      </button>
      {expanded ? (
        <div className="version-list">
          {versions.map((version) => (
            <article key={version.id} className="version-row">
              <div>
                <strong>{labelForAction(version.action)}</strong>
                <small>
                  {version.actorName} - {new Date(version.createdAt).toLocaleString()}
                </small>
              </div>
              {canRestore ? (
                <button type="button" onClick={() => void restore(version.id)}>
                  Restore
                </button>
              ) : null}
            </article>
          ))}
          {versions.length === 0 ? (
            <p className="status-text">No saved versions yet.</p>
          ) : null}
        </div>
      ) : null}
      {status ? <p className="status-text">{status}</p> : null}
    </div>
  );
}

function labelForAction(action: BoardVersion["action"]): string {
  return {
    created: "Board created",
    saved: "Manual save",
    "live-update": "Live update",
    restored: "Version restored",
  }[action];
}
