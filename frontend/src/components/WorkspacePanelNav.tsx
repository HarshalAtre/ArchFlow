import { PanelLeft, PanelRight, X } from "lucide-react";
import { useEffect } from "react";

export type WorkspacePanel = "inspector" | "tools" | null;

type WorkspacePanelNavProps = {
  activePanel: WorkspacePanel;
  onChange: (panel: WorkspacePanel) => void;
};

export function WorkspacePanelNav({
  activePanel,
  onChange,
}: WorkspacePanelNavProps) {
  useEffect(() => {
    if (!activePanel) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onChange(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activePanel, onChange]);

  return (
    <>
      <nav className="workspace-panel-nav" aria-label="Workspace panels">
        <button
          aria-expanded={activePanel === "tools"}
          className={activePanel === "tools" ? "panel-nav-active" : ""}
          type="button"
          onClick={() => onChange(activePanel === "tools" ? null : "tools")}
        >
          <PanelLeft aria-hidden="true" size={17} />
          Tools
        </button>
        <span>Canvas</span>
        <button
          aria-expanded={activePanel === "inspector"}
          className={activePanel === "inspector" ? "panel-nav-active" : ""}
          type="button"
          onClick={() =>
            onChange(activePanel === "inspector" ? null : "inspector")
          }
        >
          Inspector
          <PanelRight aria-hidden="true" size={17} />
        </button>
      </nav>
      {activePanel ? (
        <button
          aria-label="Close workspace panel"
          className="workspace-panel-backdrop"
          type="button"
          onClick={() => onChange(null)}
        />
      ) : null}
    </>
  );
}

type WorkspacePanelCloseProps = {
  label: string;
  onClose: () => void;
};

export function WorkspacePanelClose({
  label,
  onClose,
}: WorkspacePanelCloseProps) {
  return (
    <div className="workspace-panel-heading">
      <span>{label}</span>
      <button aria-label={`Close ${label}`} type="button" onClick={onClose}>
        <X aria-hidden="true" size={18} />
      </button>
    </div>
  );
}
