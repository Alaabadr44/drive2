import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

import path from "path";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true, // Auto-create tables (dev only)
  logging: false,
  entities: [path.join(__dirname, "../entities/*.{ts,js}")],
  subscribers: [],
  migrations: [],
});
