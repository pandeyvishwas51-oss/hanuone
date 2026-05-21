import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

neonConfig.fetchConnectionCache = true;

const url = process.env.DATABASE_URL;

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function db() {
  if (!url) throw new Error("DATABASE_URL not set");
  if (!dbInstance) {
    dbInstance = drizzle(neon(url), { schema });
  }
  return dbInstance;
}

export const HAS_DB = !!url;
export { schema };
