import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

type RecentBoardItem = {
  id: string;
  name: string;
  ownerId: string;
  updatedAt: string;
};

type RecentBoardListProps = {
  boards: RecentBoardItem[];
  currentUserId: string | null;
  onSelect: (boardId: string) => void;
};

const pageSize = 3;

export function RecentBoardList({
  boards,
  currentUserId,
  onSelect,
}: RecentBoardListProps) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const visibleBoards = boards.slice(0, visibleCount);
  const hasMore = visibleCount < boards.length;
  const canCollapse = boards.length > pageSize && !hasMore;

  return (
    <div className="recent-board-list">
      {visibleBoards.map((board) => (
        <button
          key={board.id}
          className="recent-board-button"
          type="button"
          onClick={() => onSelect(board.id)}
        >
          <span>{board.name}</span>
          <small>
            {board.ownerId !== currentUserId ? "Shared - " : ""}
            {formatCompactDate(board.updatedAt)}
          </small>
        </button>
      ))}

      {hasMore ? (
        <button
          className="recent-board-more command-button"
          type="button"
          onClick={() => setVisibleCount((count) => Math.min(count + pageSize, boards.length))}
        >
          <ChevronDown aria-hidden="true" size={15} />
          Load more ({boards.length - visibleCount})
        </button>
      ) : canCollapse ? (
        <button
          className="recent-board-more command-button"
          type="button"
          onClick={() => setVisibleCount(pageSize)}
        >
          <ChevronUp aria-hidden="true" size={15} />
          Show fewer
        </button>
      ) : null}
    </div>
  );
}

function formatCompactDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
}
