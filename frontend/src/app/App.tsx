import { useEffect, useRef, useState } from "react";
import { Moon, Sun, Workflow } from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import { BoardPage } from "../pages/BoardPage";
import { LLDPage } from "../pages/LLDPage";
import { acceptShareLink, type ShareMode } from "../services/sharingApi";

type DesignMode = "hld" | "lld";
type Theme = "dark" | "light";

const themeStorageKey = "archflow:theme";

export function App() {
  const [activeMode, setActiveMode] = useState<DesignMode>("hld");
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [requestedBoard, setRequestedBoard] = useState<{
    boardId: string;
    mode: ShareMode;
  } | null>(null);
  const [shareError, setShareError] = useState("");
  const authPromptedForTokenRef = useRef("");
  const { requestAuth, signOut, status, user } = useAuth();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        theme === "dark"
          ? "oklch(16.5% 0.012 255)"
          : "oklch(96.5% 0.007 250)",
      );

    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      // The selected theme still applies when browser storage is unavailable.
    }
  }, [theme]);

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
        <div className="brand-lockup" aria-label="ArchFlow">
          <span className="brand-mark" aria-hidden="true">
            <Workflow size={19} strokeWidth={2.2} />
          </span>
          <strong>ArchFlow</strong>
        </div>
        <div className="mode-switcher">
          <button
            aria-label="HLD Board"
            type="button"
            className={activeMode === "hld" ? "mode-tab mode-tab-active" : "mode-tab"}
            onClick={() => setActiveMode("hld")}
          >
            <span>HLD</span>
            <small>Architecture</small>
          </button>
          <button
            aria-label="LLD Board"
            type="button"
            className={activeMode === "lld" ? "mode-tab mode-tab-active" : "mode-tab"}
            onClick={() => setActiveMode("lld")}
          >
            <span>LLD</span>
            <small>UML design</small>
          </button>
        </div>
        <div className="header-actions">
          <button
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="theme-toggle"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            type="button"
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? (
              <Sun aria-hidden="true" size={17} />
            ) : (
              <Moon aria-hidden="true" size={17} />
            )}
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

function readInitialTheme(): Theme {
  try {
    return localStorage.getItem(themeStorageKey) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
