import { PrismaClient } from "@prisma/client";
import { db } from "~/utils/db.server";
// const db = new PrismaClient();

async function seed() {
  await db.work.createMany({
    data: [
      {
        title: "test1",
        publishedAt: new Date("2022-04-01"),
        officialSiteUrl: "https://example.com",
      },
      {
        title: "test2",
        publishedAt: new Date("2022-01-01"),
        twitterId: "TwitterMediaJP",
      },
      {
        title: "test3",
        publishedAt: new Date("2022-07-01"),
        hashtag: "ドライブマイカー ",
      },
    ],
  });
}

seed();
