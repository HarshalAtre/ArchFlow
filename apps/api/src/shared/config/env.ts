import "dotenv/config";

export const env = {
  mongoUri: process.env.MONGO_URI,
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
};
