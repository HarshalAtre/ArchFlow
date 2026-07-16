import { Schema, model } from "mongoose";

import type { BoardVersion } from "../../types/version.js";

const boardVersionSchema = new Schema<BoardVersion>(
  {
    id: { type: String, required: true, unique: true, index: true },
    boardId: { type: String, required: true, index: true },
    mode: { type: String, enum: ["hld", "lld"], required: true, index: true },
    actorId: { type: String, required: true },
    actorName: { type: String, required: true },
    action: {
      type: String,
      enum: ["created", "saved", "live-update", "restored"],
      required: true,
    },
    graph: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: String, required: true, index: true },
  },
  {
    collection: "board_versions",
    versionKey: false,
  },
);

boardVersionSchema.index({ boardId: 1, mode: 1, createdAt: -1 });

export const BoardVersionModel = model<BoardVersion>(
  "BoardVersion",
  boardVersionSchema,
);
