import type { CollaborationCursor } from "../types/collaboration";

type RemoteCursorsProps = {
  cursors: CollaborationCursor[];
};

export function RemoteCursors({ cursors }: RemoteCursorsProps) {
  return (
    <div className="remote-cursor-layer" aria-hidden="true">
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="remote-cursor"
          style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
        >
          <span />
          <small>{cursor.userName}</small>
        </div>
      ))}
    </div>
  );
}
