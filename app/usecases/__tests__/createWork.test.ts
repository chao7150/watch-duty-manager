import { describe, expect, it, vi } from "vitest";

import type { EpisodeRepository } from "~/domain/episode/repository";
import type { WorkRepository } from "~/domain/work/repository";
import { createWork } from "~/usecases/createWork";
import { Err, Ok } from "~/utils/result";

const dummyWorkInput = {
  title: "テスト作品",
  episodeDate: [new Date("2024-01-01T04:00:00+09:00")],
};

const makeMockRepos = () => {
  const workRepo: WorkRepository = {
    findById: vi.fn(),
    findManyByIds: vi.fn(),
    findManyByTitle: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    findAll: vi.fn(),
  };
  const episodeRepo: EpisodeRepository = {
    createMany: vi.fn(),
    deleteAndReorder: vi.fn(),
    findOldestPublishedAt: vi.fn(),
    groupByWorkIdWithCount: vi.fn(),
    findWorkIdsWithMinEpisodes: vi.fn(),
  };
  return { workRepo, episodeRepo };
};

describe("createWork", () => {
  it("正常系: workRepo.create と episodeRepo.createMany が正しい順序で呼ばれ Ok({ id }) を返す", async () => {
    const repos = makeMockRepos();
    repos.workRepo.create = vi.fn().mockResolvedValue(Ok({ id: 1 }));
    repos.episodeRepo.createMany = vi.fn().mockResolvedValue(Ok({ count: 1 }));

    const result = await createWork(repos)(dummyWorkInput);

    expect(result).toStrictEqual({ ok: { id: 1 } });
    expect(repos.workRepo.create).toHaveBeenCalledWith({
      title: "テスト作品",
      publishedAt: dummyWorkInput.episodeDate[0],
    });
    expect(repos.episodeRepo.createMany).toHaveBeenCalledWith([
      { workId: 1, count: 1, publishedAt: dummyWorkInput.episodeDate[0] },
    ]);
  });

  it("異常系: workRepo.create が Err を返した場合、episodeRepo.createMany は呼ばれずエラーが返る", async () => {
    const repos = makeMockRepos();
    const dbError = Err({ type: "db", message: "create failed" } as const);
    repos.workRepo.create = vi.fn().mockResolvedValue(dbError);

    const result = await createWork(repos)(dummyWorkInput);

    expect(result).toStrictEqual(dbError);
    expect(repos.episodeRepo.createMany).not.toHaveBeenCalled();
  });

  it("異常系: workRepo.create は成功したが episodeRepo.createMany が失敗した場合、Err が返る", async () => {
    const repos = makeMockRepos();
    repos.workRepo.create = vi.fn().mockResolvedValue(Ok({ id: 1 }));
    repos.episodeRepo.createMany = vi
      .fn()
      .mockResolvedValue(
        Err({ type: "db", message: "episode creation failed" } as const),
      );

    const result = await createWork(repos)(dummyWorkInput);

    expect(result.err).toBeDefined();
    expect(result.err?.type).toBe("db");
    expect(repos.workRepo.create).toHaveBeenCalledTimes(1);
    expect(repos.episodeRepo.createMany).toHaveBeenCalledTimes(1);
  });

  it("複数のエピソード日付が正しく渡される", async () => {
    const repos = makeMockRepos();
    repos.workRepo.create = vi.fn().mockResolvedValue(Ok({ id: 5 }));
    repos.episodeRepo.createMany = vi.fn().mockResolvedValue(Ok({ count: 3 }));

    const input = {
      title: "複数話作品",
      episodeDate: [
        new Date("2024-01-01T04:00:00+09:00"),
        new Date("2024-01-08T04:00:00+09:00"),
        new Date("2024-01-15T04:00:00+09:00"),
      ],
    };

    const result = await createWork(repos)(input);

    expect(result).toStrictEqual({ ok: { id: 5 } });
    expect(repos.episodeRepo.createMany).toHaveBeenCalledWith([
      { workId: 5, count: 1, publishedAt: input.episodeDate[0] },
      { workId: 5, count: 2, publishedAt: input.episodeDate[1] },
      { workId: 5, count: 3, publishedAt: input.episodeDate[2] },
    ]);
  });

  it("任意項目（officialSiteUrl, twitterId, hashtag, durationMin）が正しく渡される", async () => {
    const repos = makeMockRepos();
    repos.workRepo.create = vi.fn().mockResolvedValue(Ok({ id: 1 }));
    repos.episodeRepo.createMany = vi.fn().mockResolvedValue(Ok({ count: 1 }));

    const input = {
      title: "豊富な情報",
      episodeDate: [new Date("2024-01-01T04:00:00+09:00")],
      officialSiteUrl: "https://example.com",
      twitterId: "@test",
      hashtag: "#test",
      durationMin: 30,
    };

    await createWork(repos)(input);

    expect(repos.workRepo.create).toHaveBeenCalledWith({
      title: "豊富な情報",
      publishedAt: input.episodeDate[0],
      officialSiteUrl: "https://example.com",
      twitterId: "@test",
      hashtag: "#test",
      durationMin: 30,
    });
  });
});
