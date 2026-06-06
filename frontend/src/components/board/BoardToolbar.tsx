import type { BoardElementType, RecentBoard } from "../../types/board";

import { labelForType } from "./boardLabels";

type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

type BoardToolbarProps = {
  boardId: string | null;
  boardName: string;
  nodeTypes: BoardElementType[];
  recentBoards: RecentBoard[];
  saveStatus: SaveStatus;
  statusMessage: string;
  onAddNode: (type: BoardElementType) => void;
  onAnalyze: () => void;
  onBoardNameChange: (name: string) => void;
  onCleanUp: () => void;
  onLoadBoard: (boardId: string) => void;
  onSaveBoard: () => void;
};

export function BoardToolbar({
  boardId,
  boardName,
  nodeTypes,
  recentBoards,
  saveStatus,
  statusMessage,
  onAddNode,
  onAnalyze,
  onBoardNameChange,
  onCleanUp,
  onLoadBoard,
  onSaveBoard,
}: BoardToolbarProps) {
  return (
    <aside className="toolbar">
      <div>
        <p className="eyebrow">Architecture Board</p>
        <h1>Visual System Designer</h1>
      </div>

      {recentBoards.length > 0 ? (
        <div className="tool-section">
          <span className="section-label">Recent Boards</span>
          <div className="recent-board-list">
            {recentBoards.map((recentBoard) => (
              <button
                key={recentBoard.id}
                type="button"
                className="recent-board-button"
                onClick={() => onLoadBoard(recentBoard.id)}
              >
                <span>{recentBoard.name}</span>
                <small>{new Date(recentBoard.updatedAt).toLocaleString()}</small>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="tool-section">
        <span className="section-label">Board</span>
        <input
          aria-label="Board name"
          className="text-input"
          value={boardName}
          onChange={(event) => onBoardNameChange(event.target.value)}
        />
        <button
          type="button"
          className="primary-button"
          disabled={saveStatus === "saving" || saveStatus === "loading"}
          onClick={onSaveBoard}
        >
          {saveStatus === "saving" ? "Saving..." : "Save Board"}
        </button>
        <p className={`status-text status-${saveStatus}`}>
          {statusMessage}
          {boardId ? ` (${boardId.slice(0, 8)})` : ""}
        </p>
      </div>

      <div className="tool-section">
        <span className="section-label">Add Component</span>
        <div className="button-grid">
          {nodeTypes.map((type) => (
            <button key={type} type="button" onClick={() => onAddNode(type)}>
              {labelForType(type)}
            </button>
          ))}
        </div>
      </div>

      <div className="tool-section">
        <span className="section-label">Actions</span>
        <button type="button" onClick={onCleanUp}>
          Clean Up
        </button>
        <button type="button" onClick={onAnalyze}>
          Analyze
        </button>
      </div>
    </aside>
  );
}
