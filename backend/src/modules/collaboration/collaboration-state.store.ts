import type { RedisClientType } from "redis";

import type {
  CollaborationGraph,
  CollaborationMode,
} from "../../types/collaboration.js";

export type CollaborationRoomState = {
  boardId: string;
  graph: CollaborationGraph;
  lastEditorName: string;
  lastEditorUserId: string;
  mode: CollaborationMode;
  revision: number;
};

export interface CollaborationStateStore {
  delete(roomKey: string): Promise<void>;
  get(roomKey: string): Promise<CollaborationRoomState | null>;
  update(
    roomKey: string,
    next: Omit<CollaborationRoomState, "revision">,
  ): Promise<CollaborationRoomState>;
}

export class LocalCollaborationStateStore implements CollaborationStateStore {
  private readonly states = new Map<string, CollaborationRoomState>();

  async delete(roomKey: string): Promise<void> {
    this.states.delete(roomKey);
  }

  async get(roomKey: string): Promise<CollaborationRoomState | null> {
    return this.states.get(roomKey) ?? null;
  }

  async update(
    roomKey: string,
    next: Omit<CollaborationRoomState, "revision">,
  ): Promise<CollaborationRoomState> {
    const state = {
      ...next,
      revision: (this.states.get(roomKey)?.revision ?? 0) + 1,
    };
    this.states.set(roomKey, state);
    return state;
  }
}

export class RedisCollaborationStateStore implements CollaborationStateStore {
  constructor(private readonly redis: RedisClientType) {}

  async delete(roomKey: string): Promise<void> {
    await this.redis.del([this.stateKey(roomKey), this.revisionKey(roomKey)]);
  }

  async get(roomKey: string): Promise<CollaborationRoomState | null> {
    const serialized = await this.redis.get(this.stateKey(roomKey));
    return serialized
      ? (JSON.parse(serialized) as CollaborationRoomState)
      : null;
  }

  async update(
    roomKey: string,
    next: Omit<CollaborationRoomState, "revision">,
  ): Promise<CollaborationRoomState> {
    const revision = await this.redis.incr(this.revisionKey(roomKey));
    const state = { ...next, revision };
    await Promise.all([
      this.redis.set(this.stateKey(roomKey), JSON.stringify(state), {
        EX: 3600,
      }),
      this.redis.expire(this.revisionKey(roomKey), 3600),
    ]);
    return state;
  }

  private stateKey(roomKey: string): string {
    return `archflow:collaboration:${roomKey}:state`;
  }

  private revisionKey(roomKey: string): string {
    return `archflow:collaboration:${roomKey}:revision`;
  }
}
