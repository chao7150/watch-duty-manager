import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function seed() {
  await db.channel.createMany({
    data: [
      { id: 1, name: "MX", isRealtime: true },
      { id: 2, name: "dAS", isRealtime: false },
    ],
  });
  await db.work.create({
    data: {
      title: "チキップナイン",
      hashtag: "チキップナイン",
      imageUrl: "https://via.placeholder.com/150",
      officialSiteUrl: "https://example.com",
      twitterId: "chao7150",
      episodes: {
        create: [
          {
            id: 1,
            count: 1,
            title: "はじまり",
            description: "1話です",
            durationMin: 5,
          },
          {
            id: 2,
            count: 2,
            title: "そのつぎ",
            description: "2話です",
            durationMin: 5,
          },
        ],
      },
    },
  });
  await db.work.create({
    data: {
      title: "パンずもう",
      hashtag: "panzumo",
      imageUrl: "https://via.placeholder.com/150",
      officialSiteUrl: "https://example.com",
      twitterId: "TwitterJP",
      episodes: {
        create: [
          {
            id: 3,
            count: 1,
            title: "ep1",
            description: "beginning",
            durationMin: 30,
          },
        ],
      },
    },
  });
  await db.program.createMany({
    data: [
      { channelId: 1, episodeId: 1, releasedAt: new Date(1000) },
      { channelId: 2, episodeId: 1, releasedAt: new Date(2000) },
    ],
  });
  await db.user.create({
    data: {
      uid: "b1anrfVLNvWgTEErVJlYaSpbvDk2",
      subscribedChannels: { create: [{ channelId: 1 }, { channelId: 2 }] },
      subscribedWorks: { create: [{ workId: 1 }] },
      watchedEpisodes: { create: [{ episodeId: 1 }] },
    },
  });
}

seed();
