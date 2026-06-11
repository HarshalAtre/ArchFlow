import { useState } from "react";

import { BoardPage } from "../pages/BoardPage";
import { LldPage } from "../pages/LldPage";

type DesignMode = "hld" | "lld";

export function App() {
  const [activeMode, setActiveMode] = useState<DesignMode>("hld");

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
      </nav>
      {activeMode === "hld" ? <BoardPage /> : <LldPage />}
    </div>
  );
}
