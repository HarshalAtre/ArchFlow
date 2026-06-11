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
  onDeleteElement: () => void;
  onLabelChange: (label: string) => void;
  onMetadataChange: (metadata: NonNullable<BoardElement["metadata"]>) => void;
};

export function ContextPanel({
  selectedEdge,
  selectedElement,
  onDeleteElement,
  onLabelChange,
  onMetadataChange,
}: ContextPanelProps) {
  const metadata = selectedElement?.metadata ?? {};

  return (
    <section>
      <span className="section-label">Context Layer</span>
      <div className="context-panel-stack">
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
            <label className="field-group">
              <span>Owner</span>
              <input
                aria-label="Selected component owner"
                className="text-input"
                placeholder="Team or person responsible"
                value={metadata.owner ?? ""}
                onChange={(event) => onMetadataChange({ ...metadata, owner: event.target.value })}
              />
            </label>
            <label className="field-group">
              <span>API endpoint</span>
              <input
                aria-label="Selected component API endpoint"
                className="text-input"
                placeholder="/api/orders or https://service.internal"
                value={metadata.apiEndpoint ?? ""}
                onChange={(event) => onMetadataChange({ ...metadata, apiEndpoint: event.target.value })}
              />
            </label>
            <label className="field-group">
              <span>Reference links</span>
              <textarea
                aria-label="Selected component links"
                className="compact-textarea"
                placeholder="Docs, dashboards, tickets, runbooks..."
                value={metadata.links ?? ""}
                onChange={(event) => onMetadataChange({ ...metadata, links: event.target.value })}
              />
            </label>
            <textarea
              aria-label="Selected component notes"
              placeholder="Add implementation notes, API details, links, or code context..."
              value={metadata.notes ?? ""}
              onChange={(event) => onMetadataChange({ ...metadata, notes: event.target.value })}
            />
            <button type="button" className="danger-button" onClick={onDeleteElement}>
              Delete component
            </button>
          </div>
        ) : selectedEdge ? (
          <div className="selected-card">
            <strong>Selected connection</strong>
            <span>
              {selectedEdge.sourceLabel} {"->"} {selectedEdge.targetLabel}
            </span>
            <p className="status-text">Use the Remove button on the selected connection line, or press Delete.</p>
          </div>
        ) : (
          <p className="muted">Select a component or connection to edit its context.</p>
        )}
      </div>
    </section>
  );
}
