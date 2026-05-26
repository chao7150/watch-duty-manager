import type { EpisodeInput } from "~/domain/episode/types";
import type {
  SubscribedWorkSummary,
  TicketEpisode,
} from "~/domain/watch/types";
import type { WorkInput } from "~/domain/work/types";

export const createDummyWorkInput = (
  overrides?: Partial<WorkInput>,
): WorkInput => ({
  title: "テスト作品",
  publishedAt: new Date("2024-01-01T04:00:00+09:00"),
  durationMin: 24,
  officialSiteUrl: null,
  twitterId: null,
  hashtag: null,
  ...overrides,
});

export const createDummyEpisodeInput = (
  overrides?: Partial<EpisodeInput>,
): EpisodeInput => ({
  workId: 1,
  count: 1,
  publishedAt: new Date("2024-01-01T04:00:00+09:00"),
  ...overrides,
});

export const createDummyTicketEpisode = (
  overrides?: Partial<TicketEpisode>,
): TicketEpisode => ({
  workId: 1,
  count: 1,
  publishedAt: new Date("2024-01-10T04:00:00+09:00"),
  work: {
    title: "テスト作品",
    durationMin: 24,
    hashtag: null,
    officialSiteUrl: null,
  },
  ...overrides,
});

export const createDummySubscribedWork = (
  overrides?: Partial<SubscribedWorkSummary>,
): SubscribedWorkSummary => ({
  workId: 1,
  watchDelaySecFromPublish: 0,
  watchUrl: null,
  ...overrides,
});
