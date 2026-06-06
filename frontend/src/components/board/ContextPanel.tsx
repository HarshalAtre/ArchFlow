import type { BoardElement } from "../../types/board";

import { labelForType } from "./boardLabels";

export type SelectedEdgeDetails = {
  id: string;
  sourceLabel: string;
  targetLabel: string;
};

type ContextPanelProps = {
  selectedEdge: SelectedEdgeDetails | undefined;
  selectedElement: BoardElement | undefined;
  onDeleteEdge: () => void;
  onDeleteElement: () => void;
  onLabelChange: (label: string) => void;
  onNotesChange: (notes: string) => void;
};

export function ContextPanel({
  selectedEdge,
  selectedElement,
  onDeleteEdge,
  onDeleteElement,
  onLabelChange,
  onNotesChange,
}: ContextPanelProps) {
  return (
    <section>
      <span className="section-label">Context Layer</span>
      {selectedElement ? (
        <div className="selected-card">
          <label className="field-group">
            <span>Component label</span>
            <input
              aria-label="Selected component label"
              className="text-input"
              value={selectedElement.label}
              onChange={(event) => onLabelChange(event.target.value)}
            />
          </label>
          <span>{labelForType(selectedElement.type)}</span>
          <textarea
            aria-label="Selected component notes"
            placeholder="Add implementation notes, API details, links, or code context..."
            value={selectedElement.metadata?.notes ?? ""}
            onChange={(event) => onNotesChange(event.target.value)}
          />
          <button type="button" className="danger-button" onClick={onDeleteElement}>
            Delete component
          </button>
        </div>
      ) : selectedEdge ? (
        <div className="selected-card">
          <strong>Connection</strong>
          <span>
            {selectedEdge.sourceLabel} {"->"} {selectedEdge.targetLabel}
          </span>
          <button type="button" className="danger-button" onClick={onDeleteEdge}>
            Delete connection
          </button>
        </div>
      ) : (
        <p className="muted">Select a component to attach notes and execution context.</p>
      )}
    </section>
  );
}
