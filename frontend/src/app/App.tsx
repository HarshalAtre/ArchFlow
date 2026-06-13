import { useEffect, useRef, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { BoardPage } from "../pages/BoardPage";
import { LLDPage } from "../pages/LLDPage";
import { acceptShareLink, type ShareMode } from "../services/sharingApi";

type DesignMode = "hld" | "lld";

export function App() {
  const [activeMode, setActiveMode] = useState<DesignMode>("hld");
  const [requestedBoard, setRequestedBoard] = useState<{
    boardId: string;
    mode: ShareMode;
  } | null>(null);
  const [shareError, setShareError] = useState("");
  const authPromptedForTokenRef = useRef("");
  const { requestAuth, signOut, status, user } = useAuth();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("share");

    if (!token || status === "loading") {
      return;
    }

    if (!user) {
      if (authPromptedForTokenRef.current !== token) {
        authPromptedForTokenRef.current = token;
        requestAuth("Sign in to join this shared ArchFlow board.");
      }
      return;
    }

    let cancelled = false;
    setShareError("");

    void acceptShareLink(token)
      .then((acceptedShare) => {
        if (cancelled) {
          return;
        }

        setRequestedBoard({
          boardId: acceptedShare.boardId,
          mode: acceptedShare.mode,
        });
        setActiveMode(acceptedShare.mode);
        window.history.replaceState({}, "", window.location.pathname);
      })
      .catch((error) => {
        if (!cancelled) {
          setShareError(
            error instanceof Error
              ? error.message
              : "Could not join the shared board.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestAuth, status, user]);

  return (
    <div className="workspace-shell">
      <nav className="mode-tabs" aria-label="Design mode">
        <button
          type="button"
          className={activeMode === "hld" ? "mode-tab mode-tab-active" : "mode-tab"}
          onClick={() => setActiveMode("hld")}
        >
          HLD Board
        </button>
        <button
          type="button"
          className={activeMode === "lld" ? "mode-tab mode-tab-active" : "mode-tab"}
          onClick={() => setActiveMode("lld")}
        >
          LLD Board
        </button>
        <div className="account-control">
          {user ? (
            <>
              <span title={user.email}>{user.name}</span>
              <button type="button" onClick={() => void signOut()}>
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={status === "loading"}
              onClick={() =>
                requestAuth("Sign in when you want to save and own boards.")
              }
            >
              {status === "loading" ? "Checking session..." : "Sign in"}
            </button>
          )}
        </div>
      </nav>
      {shareError ? <p className="share-error-banner">{shareError}</p> : null}
      {activeMode === "hld" ? (
        <BoardPage
          requestedBoardId={
            requestedBoard?.mode === "hld" ? requestedBoard.boardId : null
          }
        />
      ) : (
        <LLDPage
          requestedBoardId={
            requestedBoard?.mode === "lld" ? requestedBoard.boardId : null
          }
        />
      )}
    </div>
  );
}
