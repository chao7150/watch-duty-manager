import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // まず、既存のデータをクリア
  await prisma.knowledgeEdge.deleteMany();
  await prisma.episodeStatusOnUser.deleteMany();
  await prisma.subscribedWorksOnUser.deleteMany();
  await prisma.episode.deleteMany();
  await prisma.work.deleteMany();
  await prisma.knowledgeNode.deleteMany();

  // サンプル作品データ
  const sampleWorks = [
    {
      title: "鬼滅の刃 柱稽古編",
      publishedAt: new Date("2024-05-12T01:23:00.000Z"),
      durationMin: 24,
      officialSiteUrl: "https://kimetsu.com/anime/hashiratraining/",
      twitterId: "kimetsu_off",
      hashtag: "鬼滅の刃",
      episodeCount: 8,
    },
    {
      title: "薬屋のひとりごと",
      publishedAt: new Date("2023-10-22T01:05:00.000Z"),
      durationMin: 24,
      officialSiteUrl: "https://kusuriyanohitorigoto.jp/",
      twitterId: "kusuriya_PR",
      hashtag: "薬屋のひとりごと",
      episodeCount: 24,
    },
    {
      title: "呪術廻戦 渋谷事変",
      publishedAt: new Date("2023-07-06T01:56:00.000Z"),
      durationMin: 24,
      officialSiteUrl: "https://jujutsukaisen.jp/",
      twitterId: "jujutsu_PR",
      hashtag: "呪術廻戦",
      episodeCount: 23,
    },
    {
      title: "フリーレン",
      publishedAt: new Date("2023-09-29T01:50:00.000Z"),
      durationMin: 24,
      officialSiteUrl: "https://frieren-anime.jp/",
      twitterId: "frieren_PR",
      hashtag: "フリーレン",
      episodeCount: 28,
    },
    {
      title: "ダンジョン飯",
      publishedAt: new Date("2024-01-04T01:30:00.000Z"),
      durationMin: 24,
      officialSiteUrl: "https://delicious-in-dungeon.com/",
      twitterId: "dungeon_meshi",
      hashtag: "ダンジョン飯",
      episodeCount: 24,
    },
  ];

  // 作品を作成
  const createdWorks = [];
  for (const workData of sampleWorks) {
    const { episodeCount, ...workWithoutEpisodeCount } = workData;
    const work = await prisma.work.create({
      data: {
        ...workWithoutEpisodeCount,
        knowledgeNode: {
          create: {},
        },
      },
    });
    createdWorks.push({ ...work, episodeCount });
    console.log(`✅ Created work: ${work.title} (ID: ${work.id})`);
  }

  // エピソードを作成
  let totalEpisodes = 0;
  for (const work of createdWorks) {
    let createdCount = 0;
    for (let i = 1; i <= work.episodeCount; i++) {
      // 週間間隔でエピソードを配置
      const episodeDate = new Date(work.publishedAt);
      episodeDate.setDate(episodeDate.getDate() + (i - 1) * 7);

      await prisma.episode.create({
        data: {
          work: {
            connect: { id: work.id },
          },
          count: i,
          publishedAt: episodeDate,
          title: `第${i}話`,
          description: `${work.title}の第${i}話です。`,
          knowledgeNode: {
            create: {},
          },
        },
      });
      createdCount++;
    }

    totalEpisodes += createdCount;
    console.log(`📺 Created ${createdCount} episodes for ${work.title}`);
  }

  console.log(`🎉 Seeding completed!`);
  console.log(`   - Works created: ${createdWorks.length}`);
  console.log(`   - Episodes created: ${totalEpisodes}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
