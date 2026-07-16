import type { BoardElementType, BoardGraph, RecentBoard } from "../../types/board";
import type {
  CollaborationParticipant,
  CollaborationStatus as CollaborationState,
} from "../../types/collaboration";

import { CollaborationStatus } from "../CollaborationStatus";
import { HistoryControls } from "../HistoryControls";
import { ShareBoardControl } from "../ShareBoardControl";
import { TransferControls } from "../TransferControls";
import { VersionHistory } from "../VersionHistory";
import type { ShareRole } from "../../services/sharingApi";
import { labelForType } from "./boardLabels";

type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

type BoardToolbarProps = {
  boardId: string | null;
  boardName: string;
  analyzing: boolean;
  busyExport: "pdf" | "png" | null;
  canRedo: boolean;
  canShare: boolean;
  canUndo: boolean;
  collaborationError: string;
  collaborationParticipants: CollaborationParticipant[];
  collaborationStatus: CollaborationState;
  currentUserId: string | null;
  nodeTypes: BoardElementType[];
  recentBoards: RecentBoard[];
  readOnly: boolean;
  saveStatus: SaveStatus;
  statusMessage: string;
  onAddNode: (type: BoardElementType) => void;
  onAnalyze: () => void;
  onBoardNameChange: (name: string) => void;
  onCleanUp: () => void;
  onExportJson: () => void;
  onExportPdf: () => void;
  onExportPng: () => void;
  onImportJson: (file: File) => void;
  onLoadDemoBoard: () => void;
  onLoadBoard: (boardId: string) => void;
  onRedo: () => void;
  onSaveBoard: () => void;
  onCreateShareLink: (
    role: ShareRole,
  ) => Promise<{ boardId: string; shareUrl: string }>;
  onRestoreVersion: (graph: BoardGraph) => void;
  onUndo: () => void;
};

export function BoardToolbar({
  boardId,
  boardName,
  analyzing,
  busyExport,
  canRedo,
  canShare,
  canUndo,
  collaborationError,
  collaborationParticipants,
  collaborationStatus,
  currentUserId,
  nodeTypes,
  recentBoards,
  readOnly,
  saveStatus,
  statusMessage,
  onAddNode,
  onAnalyze,
  onBoardNameChange,
  onCleanUp,
  onExportJson,
  onExportPdf,
  onExportPng,
  onImportJson,
  onLoadDemoBoard,
  onLoadBoard,
  onRedo,
  onSaveBoard,
  onCreateShareLink,
  onRestoreVersion,
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
                <small>
                  {recentBoard.ownerId !== currentUserId ? "Shared - " : ""}
                  {new Date(recentBoard.updatedAt).toLocaleString()}
                </small>
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
          disabled={readOnly}
          value={boardName}
          onChange={(event) => onBoardNameChange(event.target.value)}
        />
        <button
          type="button"
          className="primary-button"
          disabled={readOnly || saveStatus === "saving" || saveStatus === "loading"}
          onClick={onSaveBoard}
        >
          {saveStatus === "saving" ? "Saving..." : "Save Board"}
        </button>
        <p className={`status-text status-${saveStatus}`}>
          {statusMessage}
          {boardId ? ` (${boardId.slice(0, 8)})` : ""}
        </p>
        <CollaborationStatus
          error={collaborationError}
          participants={collaborationParticipants}
          status={collaborationStatus}
        />
        {canShare ? (
          <ShareBoardControl
            boardId={boardId}
            mode="hld"
            onCreateLink={onCreateShareLink}
          />
        ) : null}
        <VersionHistory
          boardId={boardId}
          canRestore={!readOnly}
          mode="hld"
          onRestore={(graph) => onRestoreVersion(graph as BoardGraph)}
        />
        <button type="button" onClick={onLoadDemoBoard}>
          Load Demo Board
        </button>
      </div>

      <div className="tool-section">
        <span className="section-label">Add Component</span>
        <div className="button-grid">
          {nodeTypes.map((type) => (
            <button key={type} type="button" disabled={readOnly} onClick={() => onAddNode(type)}>
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
        <button type="button" disabled={readOnly} onClick={onCleanUp}>
          Clean Up
        </button>
        <button type="button" disabled={analyzing} onClick={onAnalyze}>
          {analyzing ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      <div className="tool-section">
        <span className="section-label">Import / Export</span>
        <TransferControls
          busyAction={busyExport}
          onExportJson={onExportJson}
          onExportPdf={onExportPdf}
          onExportPng={onExportPng}
          onImportJson={onImportJson}
        />
      </div>
    </aside>
  );
}
