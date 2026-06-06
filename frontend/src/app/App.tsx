import { ReactFlowProvider } from "@xyflow/react";

import { BoardPage } from "../pages/BoardPage";

export function App() {
  return (
    <ReactFlowProvider>
      <BoardPage />
    </ReactFlowProvider>
  );
}
