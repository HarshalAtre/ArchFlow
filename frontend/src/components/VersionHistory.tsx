import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, History, RotateCcw } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!expanded || !boardId) {
      return;
    }
    setPage(1);
    void refresh(1);
  }, [boardId, expanded, mode]);

  async function refresh(requestedPage: number) {
    if (!boardId) {
      return;
    }
    setLoading(true);
    try {
      const result = await listBoardVersions(mode, boardId, requestedPage);
      setVersions(result.versions);
      setPage(result.page);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load history.");
    } finally {
      setLoading(false);
    }
  }

  function changePage(nextPage: number) {
    if (loading || nextPage < 1 || nextPage > totalPages) {
      return;
    }
    setPage(nextPage);
    void refresh(nextPage);
  }

  async function restore(versionId: string) {
    if (!boardId) {
      return;
    }
    try {
      const graph = await restoreBoardVersion(mode, boardId, versionId);
      onRestore(graph);
      await refresh(1);
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
                  {version.actorName} - {formatVersionDate(version.createdAt)}
                </small>
              </div>
              {canRestore ? (
                <button
                  className="command-button version-restore-button"
                  type="button"
                  onClick={() => void restore(version.id)}
                >
                  <RotateCcw aria-hidden="true" size={14} />
                  Restore
                </button>
              ) : null}
            </article>
          ))}
          {loading && versions.length === 0 ? (
            <p className="status-text">Loading versions...</p>
          ) : null}
          {!loading && versions.length === 0 ? (
            <p className="status-text">No saved versions yet.</p>
          ) : null}
          {totalPages > 1 ? (
            <nav aria-label="Version history pages" className="version-pagination">
              <button
                aria-label="Previous version page"
                className="icon-command-button"
                disabled={loading || page === 1}
                title="Previous page"
                type="button"
                onClick={() => changePage(page - 1)}
              >
                <ChevronLeft aria-hidden="true" size={15} />
              </button>
              <span>
                {page} / {totalPages} <small>({total})</small>
              </span>
              <button
                aria-label="Next version page"
                className="icon-command-button"
                disabled={loading || page === totalPages}
                title="Next page"
                type="button"
                onClick={() => changePage(page + 1)}
              >
                <ChevronRight aria-hidden="true" size={15} />
              </button>
            </nav>
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

function formatVersionDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
}
