import type { BoardElementType, BoardGraph, RecentBoard } from "../../types/board";
import {
  Boxes,
  CloudCog,
  Database,
  FileOutput,
  FolderClock,
  MonitorSmartphone,
  Network,
  PanelTop,
  ScanSearch,
  Settings2,
  Sparkles,
  Users,
  Waypoints,
  Zap,
} from "lucide-react";
import type {
  CollaborationParticipant,
  CollaborationStatus as CollaborationState,
} from "../../types/collaboration";

import { CollaborationStatus } from "../CollaborationStatus";
import { HistoryControls } from "../HistoryControls";
import { RecentBoardList } from "../RecentBoardList";
import { ShareBoardControl } from "../ShareBoardControl";
import { TransferControls } from "../TransferControls";
import { VersionHistory } from "../VersionHistory";
import { BoardManagementControls } from "../BoardManagementControls";
import { WorkspacePanelClose } from "../WorkspacePanelNav";
import {
  CreationPicker,
  type CreationPickerItem,
} from "../CreationPicker";
import { DisclosureSection } from "../DisclosureSection";
import type { BoardAccessRole } from "../../types/board";
import type { ShareRole } from "../../services/sharingApi";

type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

const componentPickerItems: CreationPickerItem<BoardElementType>[] = [
  { id: "client", label: "Client", description: "User-facing", icon: MonitorSmartphone, tone: "cyan" },
  { id: "api-gateway", label: "API Gateway", description: "Entry point", icon: Network, tone: "amber" },
  { id: "service", label: "Service", description: "Compute", icon: Boxes, tone: "blue" },
  { id: "database", label: "Database", description: "Persistent", icon: Database, tone: "green" },
  { id: "cache", label: "Cache", description: "Fast data", icon: Zap, tone: "magenta" },
  { id: "queue", label: "Queue", description: "Async flow", icon: Waypoints, tone: "yellow" },
  { id: "external-api", label: "External API", description: "Third-party", icon: CloudCog, tone: "red" },
];

type BoardToolbarProps = {
  boardId: string | null;
  boardAccessRole: BoardAccessRole | null;
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
  mobileOpen: boolean;
  onAddNode: (type: BoardElementType) => void;
  onAnalyze: () => void;
  onBoardNameChange: (name: string) => void;
  onCleanUp: () => void;
  onExportJson: () => void;
  onExportPdf: () => void;
  onExportPng: () => void;
  onImportJson: (file: File) => void;
  onLoadDemoBoard: () => void;
  onDuplicateBoard: () => Promise<void>;
  onNewBlankBoard: () => void;
  onRemoveBoard: () => Promise<void>;
  onRenameBoard: () => Promise<void>;
  onLoadBoard: (boardId: string) => void;
  onRedo: () => void;
  onSaveBoard: () => void;
  onCreateShareLink: (
    role: ShareRole,
  ) => Promise<{ boardId: string; shareUrl: string }>;
  onRestoreVersion: (graph: BoardGraph) => void;
  onUndo: () => void;
  onMobileClose: () => void;
};

export function BoardToolbar({
  boardId,
  boardAccessRole,
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
  mobileOpen,
  onAddNode,
  onAnalyze,
  onBoardNameChange,
  onCleanUp,
  onExportJson,
  onExportPdf,
  onExportPng,
  onImportJson,
  onLoadDemoBoard,
  onDuplicateBoard,
  onNewBlankBoard,
  onRemoveBoard,
  onRenameBoard,
  onLoadBoard,
  onRedo,
  onSaveBoard,
  onCreateShareLink,
  onRestoreVersion,
  onUndo,
  onMobileClose,
}: BoardToolbarProps) {
  return (
    <aside
      aria-label="HLD tools"
      className={`toolbar workspace-tools-panel ${mobileOpen ? "workspace-panel-open" : ""}`}
    >
      <WorkspacePanelClose label="Tools" onClose={onMobileClose} />

      <DisclosureSection defaultOpen icon={Boxes} title="Components">
        <CreationPicker
          disabled={readOnly}
          items={componentPickerItems.filter((item) => nodeTypes.includes(item.id))}
          onSelect={onAddNode}
        />
      </DisclosureSection>

      <DisclosureSection defaultOpen icon={PanelTop} title="Board">
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
      </DisclosureSection>

      {recentBoards.length > 0 ? (
        <DisclosureSection defaultOpen icon={FolderClock} title="Recent Boards">
          <RecentBoardList
            boards={recentBoards}
            currentUserId={currentUserId}
            onSelect={onLoadBoard}
          />
        </DisclosureSection>
      ) : null}

      <DisclosureSection icon={Users} title="Collaboration">
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
      </DisclosureSection>

      <DisclosureSection icon={ScanSearch} title="Review">
        <HistoryControls
          canRedo={canRedo}
          canUndo={canUndo}
          onRedo={onRedo}
          onUndo={onUndo}
        />
        <button className="command-button" type="button" disabled={readOnly} onClick={onCleanUp}>
          <Sparkles aria-hidden="true" size={16} />
          Clean Up
        </button>
        <button className="command-button" type="button" disabled={analyzing} onClick={onAnalyze}>
          <ScanSearch aria-hidden="true" size={16} />
          {analyzing ? "Analyzing..." : "Analyze"}
        </button>
      </DisclosureSection>

      <DisclosureSection icon={FileOutput} title="Import / Export">
        <TransferControls
          busyAction={busyExport}
          onExportJson={onExportJson}
          onExportPdf={onExportPdf}
          onExportPng={onExportPng}
          onImportJson={onImportJson}
        />
      </DisclosureSection>

      <DisclosureSection icon={Settings2} title="Board Actions">
        <BoardManagementControls
          accessRole={boardAccessRole}
          boardId={boardId}
          busy={saveStatus === "loading" || saveStatus === "saving"}
          onDuplicate={onDuplicateBoard}
          onNewBlank={onNewBlankBoard}
          onRemove={onRemoveBoard}
          onRename={onRenameBoard}
        />
        <button className="command-button" type="button" onClick={onLoadDemoBoard}>
          <PanelTop aria-hidden="true" size={16} />
          Load Demo Board
        </button>
      </DisclosureSection>
    </aside>
  );
}
