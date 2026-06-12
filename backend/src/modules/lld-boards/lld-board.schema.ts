import { Schema, model } from "mongoose";

import type { LldBoard } from "../../types/lld.js";

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
    signature: { type: String, required: true },
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
    responsibility: { type: String, required: true },
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
    label: { type: String, required: true },
    sourceMultiplicity: { type: String, required: true },
    targetMultiplicity: { type: String, required: true },
  },
  { _id: false },
);

const lldBoardSchema = new Schema<LldBoard>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
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

export const LldBoardModel = model<LldBoard>("LldBoard", lldBoardSchema);
