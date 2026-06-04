import { ReactFlowProvider } from "@xyflow/react";

import { BoardPage } from "../features/board/BoardPage";

export function App() {
  return (
    <ReactFlowProvider>
      <BoardPage />
    </ReactFlowProvider>
  );
}
