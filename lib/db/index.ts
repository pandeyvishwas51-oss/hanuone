import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Cache fetch responses for repeated identical SELECTs in the same edge invocation.
neonConfig.fetchConnectionCache = true;

const url = process.env.DATABASE_URL;

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function db() {
  if (!url) {
    throw new Error(
      "DATABASE_URL not set. Connect a Neon database to your Vercel project (or set it locally)."
    );
  }
  if (!dbInstance) {
    const sql = neon(url);
    dbInstance = drizzle(sql, { schema });
  }
  return dbInstance;
}

export const HAS_DB = !!url;

export { schema };
