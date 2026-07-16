import { Schema, model } from "mongoose";

import type { Board } from "../../types/board.js";

const positionSchema = new Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  { _id: false },
);

const sizeSchema = new Schema(
  {
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false },
);

const boardElementSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    position: { type: positionSchema, required: true },
    size: { type: sizeSchema, required: true },
    label: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const boardEdgeSchema = new Schema(
  {
    id: { type: String, required: true },
    sourceElementId: { type: String, required: true },
    targetElementId: { type: String, required: true },
    label: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const boardSchema = new Schema<Board>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
    collaboratorIds: { type: [String], default: [], index: true },
    viewerIds: { type: [String], default: [], index: true },
    shareToken: { type: String, sparse: true, unique: true },
    shareRole: { type: String, enum: ["editor", "viewer"] },
    elements: { type: [boardElementSchema], default: [] },
    edges: { type: [boardEdgeSchema], default: [] },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    collection: "boards",
    versionKey: false,
  },
);

export const BoardModel = model<Board>("Board", boardSchema);
