import mongoose from "mongoose";

export async function connectToMongo(mongoUri: string): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10_000,
  });
}
