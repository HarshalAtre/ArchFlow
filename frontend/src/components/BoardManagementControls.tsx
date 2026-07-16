import { useState } from "react";

import type { BoardAccessRole } from "../types/board";

type BoardManagementControlsProps = {
  accessRole: BoardAccessRole | null;
  boardId: string | null;
  busy: boolean;
  onDuplicate: () => Promise<void>;
  onNewBlank: () => void;
  onRemove: () => Promise<void>;
  onRename: () => Promise<void>;
};

export function BoardManagementControls({
  accessRole,
  boardId,
  busy,
  onDuplicate,
  onNewBlank,
  onRemove,
  onRename,
}: BoardManagementControlsProps) {
  const [action, setAction] = useState<
    "duplicate" | "remove" | "rename" | null
  >(null);
  const shared = Boolean(boardId && accessRole && accessRole !== "owner");

  async function run(
    nextAction: NonNullable<typeof action>,
    operation: () => Promise<void>,
  ) {
    setAction(nextAction);
    try {
      await operation();
    } finally {
      setAction(null);
    }
  }

  function confirmRemoval() {
    const message = shared
      ? "Leave this shared board? It will disappear from your recent boards."
      : "Delete this board permanently? Its saved version history will also be deleted.";

    if (window.confirm(message)) {
      void run("remove", onRemove);
    }
  }

  return (
    <div className="board-management">
      <button type="button" disabled={busy} onClick={onNewBlank}>
        New Blank
      </button>
      {boardId && accessRole !== "viewer" ? (
        <button
          type="button"
          disabled={busy || action !== null}
          onClick={() => void run("rename", onRename)}
        >
          {action === "rename" ? "Renaming..." : "Rename & Save"}
        </button>
      ) : null}
      {boardId ? (
        <button
          type="button"
          disabled={busy || action !== null}
          onClick={() => void run("duplicate", onDuplicate)}
        >
          {action === "duplicate" ? "Duplicating..." : "Duplicate"}
        </button>
      ) : null}
      {boardId ? (
        <button
          type="button"
          className="danger-button"
          disabled={busy || action !== null}
          onClick={confirmRemoval}
        >
          {action === "remove"
            ? shared
              ? "Leaving..."
              : "Deleting..."
            : shared
              ? "Leave Shared Board"
              : "Delete Board"}
        </button>
      ) : null}
    </div>
  );
}
