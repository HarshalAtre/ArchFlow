import { Paperclip } from "lucide-react";
import { useRef, useState } from "react";

import type { ContextItem } from "../types/board";
import { DisclosureSection } from "./DisclosureSection";

const maxAttachmentBytes = 256 * 1024;

type ContextItemsEditorProps = {
  disabled?: boolean;
  items: ContextItem[];
  onChange: (items: ContextItem[]) => void;
};

export function ContextItemsEditor({
  disabled = false,
  items,
  onChange,
}: ContextItemsEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<"link" | "snippet">("link");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [error, setError] = useState("");

  function addItem() {
    if (!title.trim() || !value.trim()) {
      setError("Add a title and content first.");
      return;
    }

    if (kind === "link" && !isSafeWebUrl(value.trim())) {
      setError("Links must start with http:// or https://.");
      return;
    }

    const item: ContextItem =
      kind === "link"
        ? {
            id: crypto.randomUUID(),
            type: "link",
            title: title.trim(),
            url: value.trim(),
          }
        : {
            id: crypto.randomUUID(),
            type: "snippet",
            title: title.trim(),
            content: value,
            language: language.trim() || "text",
          };

    onChange([...items, item]);
    setTitle("");
    setValue("");
    setError("");
  }

  async function attachFile(file: File) {
    if (file.size > maxAttachmentBytes) {
      setError("Files must be 256 KB or smaller.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        type: "file",
        title: file.name,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
      },
    ]);
    setError("");
  }

  return (
    <DisclosureSection
      icon={Paperclip}
      title={`Attachments (${items.length})`}
      variant="inspector"
    >
      {items.length > 0 ? (
        <div className="context-item-list">
          {items.map((item) => (
            <article key={item.id} className="context-item">
              <div>
                <strong>{item.title}</strong>
                <small>{item.type}</small>
              </div>
              {item.type === "link" ? (
                <a href={item.url} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : null}
              {item.type === "snippet" ? (
                <pre><code>{item.content}</code></pre>
              ) : null}
              {item.type === "file" && item.dataUrl ? (
                <a href={item.dataUrl} download={item.fileName}>
                  Download
                </a>
              ) : null}
              <button
                type="button"
                className="danger-button"
                disabled={disabled}
                onClick={() => onChange(items.filter(({ id }) => id !== item.id))}
              >
                Remove
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="status-text">No links, snippets, or files attached.</p>
      )}

      <div className="context-item-form">
        <select
          className="text-input"
          disabled={disabled}
          value={kind}
          onChange={(event) => setKind(event.target.value as "link" | "snippet")}
        >
          <option value="link">Link</option>
          <option value="snippet">Code snippet</option>
        </select>
        <input
          className="text-input"
          disabled={disabled}
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        {kind === "snippet" ? (
          <input
            className="text-input"
            disabled={disabled}
            placeholder="Language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          />
        ) : null}
        <textarea
          className="compact-textarea"
          disabled={disabled}
          placeholder={kind === "link" ? "https://..." : "Paste code..."}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="split-actions">
          <button type="button" disabled={disabled} onClick={addItem}>
            Add {kind === "link" ? "Link" : "Snippet"}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            Attach File
          </button>
        </div>
        <input
          ref={fileInputRef}
          hidden
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void attachFile(file);
            }
            event.target.value = "";
          }}
        />
        {error ? <p className="status-text status-error">{error}</p> : null}
      </div>
    </DisclosureSection>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function isSafeWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
