import type { BoardElement } from "../../types/board";

import { labelForType } from "./boardLabels";

type ContextPanelProps = {
  selectedElement: BoardElement | undefined;
  onLabelChange: (label: string) => void;
  onNotesChange: (notes: string) => void;
};

export function ContextPanel({
  selectedElement,
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
        </div>
      ) : (
        <p className="muted">Select a component to attach notes and execution context.</p>
      )}
    </section>
  );
}
