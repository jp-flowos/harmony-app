import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Return a proxy that throws on actual usage but allows build to pass
    return new Proxy({} as ReturnType<typeof drizzle>, {
      get() {
        throw new Error("DATABASE_URL is not set");
      },
    });
  }
  const client = postgres(connectionString, {
    prepare: false,
    ssl: "require",
    connection: { search_path: "si_mvp,public,extensions" },
  });
  return drizzle(client, { schema });
}

export const db = createDb();
