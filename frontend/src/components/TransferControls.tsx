import { ChangeEvent, useRef } from "react";
import { FileJson, FileText, Image, Upload } from "lucide-react";

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
        <button className="command-button" type="button" disabled={busyAction !== null} onClick={onExportPng}>
          <Image aria-hidden="true" size={16} />
          {busyAction === "png" ? "Exporting..." : "PNG"}
        </button>
        <button className="command-button" type="button" disabled={busyAction !== null} onClick={onExportPdf}>
          <FileText aria-hidden="true" size={16} />
          {busyAction === "pdf" ? "Exporting..." : "PDF"}
        </button>
        <button className="command-button" type="button" disabled={busyAction !== null} onClick={onExportJson}>
          <FileJson aria-hidden="true" size={16} />
          Export JSON
        </button>
        <button
          type="button"
          className="command-button"
          disabled={busyAction !== null}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload aria-hidden="true" size={16} />
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
