import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function seed() {
  await db.work.createMany({
    data: [
      {
        id: 0,
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
  await db.episode.createMany({
    data: Array.from({ length: 13 }).map((_, index) => {
      return { count: index, workId: 1, publishedAt: new Date() };
    }),
  });
  await db.subscribedWorksOnUser.create({
    data: { userId: "AXQXX7qY1FdjqqNXLjWJypwSVqZ2", workId: 1 },
  });
  await db.watchedEpisodesOnUser.create({
    data: {
      userId: "AXQXX7qY1FdjqqNXLjWJypwSVqZ2",
      workId: 1,
      count: 1,
      createdAt: new Date(),
    },
  });
}

seed();
