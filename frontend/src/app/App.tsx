import { useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { BoardPage } from "../pages/BoardPage";
import { LLDPage } from "../pages/LLDPage";

type DesignMode = "hld" | "lld";

export function App() {
  const [activeMode, setActiveMode] = useState<DesignMode>("hld");
  const { requestAuth, signOut, status, user } = useAuth();

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
      {activeMode === "hld" ? <BoardPage /> : <LLDPage />}
    </div>
  );
}
