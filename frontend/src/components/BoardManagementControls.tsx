import { useState } from "react";
import { Copy, FilePlus2, LogOut, Pencil, Trash2 } from "lucide-react";

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
  const RemoveIcon = shared ? LogOut : Trash2;

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
      <button className="command-button" type="button" disabled={busy} onClick={onNewBlank}>
        <FilePlus2 aria-hidden="true" size={16} />
        New Blank
      </button>
      {boardId && accessRole !== "viewer" ? (
        <button
          type="button"
          className="command-button"
          disabled={busy || action !== null}
          onClick={() => void run("rename", onRename)}
        >
          <Pencil aria-hidden="true" size={16} />
          {action === "rename" ? "Renaming..." : "Rename & Save"}
        </button>
      ) : null}
      {boardId ? (
        <button
          type="button"
          className="command-button"
          disabled={busy || action !== null}
          onClick={() => void run("duplicate", onDuplicate)}
        >
          <Copy aria-hidden="true" size={16} />
          {action === "duplicate" ? "Duplicating..." : "Duplicate"}
        </button>
      ) : null}
      {boardId ? (
        <button
          type="button"
          className="command-button danger-button"
          disabled={busy || action !== null}
          onClick={confirmRemoval}
        >
          <RemoveIcon aria-hidden="true" size={16} />
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
