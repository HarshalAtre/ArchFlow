import { ChangeEvent, useRef } from "react";

type TransferControlsProps = {
  busyAction: "pdf" | "png" | null;
  onExportJson: () => void;
  onExportPdf: () => void;
  onExportPng: () => void;
  onImportJson: (file: File) => void;
};

export function TransferControls({
  busyAction,
  onExportJson,
  onExportPdf,
  onExportPng,
  onImportJson,
}: TransferControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      onImportJson(file);
    }

    event.target.value = "";
  };

  return (
    <div className="transfer-controls">
      <div className="transfer-button-grid">
        <button type="button" disabled={busyAction !== null} onClick={onExportPng}>
          {busyAction === "png" ? "Exporting..." : "PNG"}
        </button>
        <button type="button" disabled={busyAction !== null} onClick={onExportPdf}>
          {busyAction === "pdf" ? "Exporting..." : "PDF"}
        </button>
        <button type="button" disabled={busyAction !== null} onClick={onExportJson}>
          Export JSON
        </button>
        <button
          type="button"
          disabled={busyAction !== null}
          onClick={() => fileInputRef.current?.click()}
        >
          Import JSON
        </button>
      </div>
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
      />
    </div>
  );
}
