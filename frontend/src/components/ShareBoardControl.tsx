import { useState } from "react";

type ShareBoardControlProps = {
  onCreateLink: () => Promise<string>;
};

export function ShareBoardControl({
  onCreateLink,
}: ShareBoardControlProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreateLink() {
    setLoading(true);
    setStatus("");

    try {
      const nextShareUrl = await onCreateLink();
      setShareUrl(nextShareUrl);
      await copyShareUrl(nextShareUrl);
      setStatus("Share link copied");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not create share link",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await copyShareUrl(shareUrl);
      setStatus("Share link copied");
    } catch {
      setStatus("Select and copy the link below");
    }
  }

  return (
    <div className="share-control">
      <button type="button" disabled={loading} onClick={handleCreateLink}>
        {loading ? "Creating link..." : "Share Board"}
      </button>
      {shareUrl ? (
        <div className="share-link-row">
          <input
            aria-label="Board share link"
            className="text-input"
            readOnly
            value={shareUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
          <button type="button" onClick={handleCopy}>
            Copy
          </button>
        </div>
      ) : null}
      {status ? <p className="status-text">{status}</p> : null}
    </div>
  );
}

async function copyShareUrl(shareUrl: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error("Clipboard access is unavailable.");
  }

  await navigator.clipboard.writeText(shareUrl);
}
