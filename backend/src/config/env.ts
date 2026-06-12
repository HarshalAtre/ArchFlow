import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

export const env = {
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
  mongoUri: process.env.MONGO_URI,
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
};
