import type {
  CollaborationMode,
  CollaborationParticipant,
  CollaborationSocketData,
} from "../../types/collaboration.js";

export function roomKeyFor(mode: CollaborationMode, boardId: string): string {
  return `board:${mode}:${boardId}`;
}

export function participantListForSockets(
  sockets: Array<{ data: CollaborationSocketData }>,
): CollaborationParticipant[] {
  const participants = new Map<string, CollaborationParticipant>();

  for (const socket of sockets) {
    const user = socket.data.user;
    const current = participants.get(user.id);

    participants.set(user.id, {
      id: user.id,
      name: user.name,
      connectionCount: (current?.connectionCount ?? 0) + 1,
    });
  }

  return [...participants.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}
