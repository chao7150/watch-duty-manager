// https://remix.run/docs/en/v1/tutorials/jokes#connect-to-the-database
import { PrismaClient } from "@prisma/client";

let db: PrismaClient;

declare global {
  /* eslint-disable-next-line no-var */
  var __db: PrismaClient | undefined;
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
if (process.env.NODE_ENV === "production") {
  db = new PrismaClient();
  db.$connect();
} else {
  if (!global.__db) {
    global.__db = new PrismaClient({
      log: ["info", "warn", "error"],
    });
    global.__db.$connect();
  }
  db = global.__db;
}

export { db };
