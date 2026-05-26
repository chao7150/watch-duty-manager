import { afterAll, beforeAll, beforeEach } from "vitest";

import { db } from "~/utils/db.server";

beforeAll(async () => {
  await db.$connect();
});

beforeEach(async () => {
  await db.episodeStatusOnUser.deleteMany();
  await db.subscribedWorksOnUser.deleteMany();
  await db.episode.deleteMany();
  await db.work.deleteMany();
});

afterAll(async () => {
  await db.$disconnect();
});
