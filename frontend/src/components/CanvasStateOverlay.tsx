import { CircleAlert, LoaderCircle, Plus } from "lucide-react";

type CanvasStateOverlayProps = {
  actionLabel?: string;
  description: string;
  kind: "empty" | "error" | "loading";
  onAction?: () => void;
  title: string;
};

export function CanvasStateOverlay({
  actionLabel,
  description,
  kind,
  onAction,
  title,
}: CanvasStateOverlayProps) {
  return (
    <div
      aria-live={kind === "loading" ? "polite" : undefined}
      className={`canvas-state-overlay canvas-state-${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <div className="canvas-state-content">
        {kind === "loading" ? (
          <LoaderCircle aria-hidden="true" className="canvas-state-spinner" size={24} />
        ) : kind === "error" ? (
          <CircleAlert aria-hidden="true" size={24} />
        ) : (
          <Plus aria-hidden="true" size={24} />
        )}
        <strong>{title}</strong>
        <p>{description}</p>
        {actionLabel && onAction ? (
          <button
            className={kind === "error" ? "" : "primary-button"}
            type="button"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
