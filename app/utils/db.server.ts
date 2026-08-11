import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "#prisma/client";

let db: PrismaClient;

declare global {
  var __db: PrismaClient | undefined;
}

const createAdapter = () =>
  new PrismaMariaDb(process.env.DATABASE_URL as string);

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
if (process.env.NODE_ENV === "production") {
  db = new PrismaClient({ adapter: createAdapter() });
  db.$connect();
} else {
  if (!global.__db) {
    global.__db = new PrismaClient({
      adapter: createAdapter(),
      log: ["info", "warn", "error"],
    });
    global.__db.$connect();
  }
  db = global.__db;
}

export { db };
