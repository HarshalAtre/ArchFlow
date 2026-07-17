type HistoryControlsProps = {
  canRedo: boolean;
  canUndo: boolean;
  onRedo: () => void;
  onUndo: () => void;
};

export function HistoryControls({
  canRedo,
  canUndo,
  onRedo,
  onUndo,
}: HistoryControlsProps) {
  return (
    <div className="history-controls" aria-label="Edit history">
      <button className="command-button" type="button" disabled={!canUndo} title="Undo (Ctrl+Z)" onClick={onUndo}>
        <Undo2 aria-hidden="true" size={16} />
        Undo
      </button>
      <button className="command-button" type="button" disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" onClick={onRedo}>
        <Redo2 aria-hidden="true" size={16} />
        Redo
      </button>
    </div>
  );
}
import { Redo2, Undo2 } from "lucide-react";
