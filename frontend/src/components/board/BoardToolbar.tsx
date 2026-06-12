import type { BoardElementType, RecentBoard } from "../../types/board";

import { HistoryControls } from "../HistoryControls";
import { labelForType } from "./boardLabels";

type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

type BoardToolbarProps = {
  boardId: string | null;
  boardName: string;
  canRedo: boolean;
  canUndo: boolean;
  nodeTypes: BoardElementType[];
  recentBoards: RecentBoard[];
  saveStatus: SaveStatus;
  statusMessage: string;
  onAddNode: (type: BoardElementType) => void;
  onAnalyze: () => void;
  onBoardNameChange: (name: string) => void;
  onCleanUp: () => void;
  onLoadDemoBoard: () => void;
  onLoadBoard: (boardId: string) => void;
  onRedo: () => void;
  onSaveBoard: () => void;
  onUndo: () => void;
};

export function BoardToolbar({
  boardId,
  boardName,
  canRedo,
  canUndo,
  nodeTypes,
  recentBoards,
  saveStatus,
  statusMessage,
  onAddNode,
  onAnalyze,
  onBoardNameChange,
  onCleanUp,
  onLoadDemoBoard,
  onLoadBoard,
  onRedo,
  onSaveBoard,
  onUndo,
}: BoardToolbarProps) {
  return (
    <aside className="toolbar">
      <div>
        <p className="eyebrow">Architecture Board</p>
        <h1>ArchFlow</h1>
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
        <button type="button" onClick={onLoadDemoBoard}>
          Load Demo Board
        </button>
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
        <HistoryControls
          canRedo={canRedo}
          canUndo={canUndo}
          onRedo={onRedo}
          onUndo={onUndo}
        />
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
