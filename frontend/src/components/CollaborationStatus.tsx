import type {
  CollaborationParticipant,
  CollaborationStatus as Status,
} from "../types/collaboration";

type CollaborationStatusProps = {
  error: string;
  participants: CollaborationParticipant[];
  status: Status;
};

export function CollaborationStatus({
  error,
  participants,
  status,
}: CollaborationStatusProps) {
  if (status === "offline") {
    return null;
  }

  const sessionCount = participants.reduce(
    (total, participant) => total + participant.connectionCount,
    0,
  );

  return (
    <div className={`collaboration-status collaboration-${status}`}>
      <span>
        {status === "connecting"
          ? "Connecting live sync..."
          : status === "error"
            ? "Live sync unavailable"
            : `Live sync: ${sessionCount || 1} session${sessionCount === 1 ? "" : "s"}`}
      </span>
      {status === "live" && participants.length > 0 ? (
        <>
          <small>
            {participants
              .map((participant) =>
                participant.connectionCount > 1
                  ? `${participant.name} (${participant.connectionCount})`
                  : participant.name,
              )
              .join(", ")}
          </small>
          <small>Live changes save automatically.</small>
        </>
      ) : null}
      {error ? <small>{error}</small> : null}
    </div>
  );
}
