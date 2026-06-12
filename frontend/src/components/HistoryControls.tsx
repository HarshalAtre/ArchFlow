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
      <button type="button" disabled={!canUndo} title="Undo (Ctrl+Z)" onClick={onUndo}>
        Undo
      </button>
      <button type="button" disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" onClick={onRedo}>
        Redo
      </button>
    </div>
  );
}
