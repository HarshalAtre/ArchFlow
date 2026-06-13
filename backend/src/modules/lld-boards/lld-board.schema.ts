import { Schema, model } from "mongoose";

import type { LLDBoard } from "../../types/lld.js";

const positionSchema = new Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  { _id: false },
);

const memberSchema = new Schema(
  {
    id: { type: String, required: true },
    signature: { type: String, default: "" },
    visibility: { type: String, required: true },
  },
  { _id: false },
);

const umlClassSchema = new Schema(
  {
    id: { type: String, required: true },
    kind: { type: String, required: true },
    name: { type: String, required: true },
    position: { type: positionSchema, required: true },
    attributes: { type: [memberSchema], default: [] },
    methods: { type: [memberSchema], default: [] },
    responsibility: { type: String, default: "" },
  },
  { _id: false },
);

const relationshipSchema = new Schema(
  {
    id: { type: String, required: true },
    sourceClassId: { type: String, required: true },
    targetClassId: { type: String, required: true },
    sourceHandleId: { type: String },
    targetHandleId: { type: String },
    kind: { type: String, required: true },
    label: { type: String, default: "" },
    sourceMultiplicity: { type: String, default: "" },
    targetMultiplicity: { type: String, default: "" },
  },
  { _id: false },
);

const lldBoardSchema = new Schema<LLDBoard>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
    collaboratorIds: { type: [String], default: [], index: true },
    shareToken: { type: String, sparse: true, unique: true },
    classes: { type: [umlClassSchema], default: [] },
    relationships: { type: [relationshipSchema], default: [] },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true, index: true },
  },
  {
    collection: "lld_boards",
    versionKey: false,
  },
);

export const LLDBoardModel = model<LLDBoard>("LLDBoard", lldBoardSchema);
