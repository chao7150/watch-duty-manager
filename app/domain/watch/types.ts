export interface SubscribedWorkSummary {
  workId: number;
  watchDelaySecFromPublish: number | null;
  watchUrl: string | null;
}

export interface WatchSettingsInput {
  watchDelaySecFromPublish?: number | null;
  watchUrl?: string | null;
}

export interface TicketWorkSummary {
  title: string;
  durationMin: number;
  hashtag: string | null;
  officialSiteUrl: string | null;
}

export interface TicketEpisode {
  workId: number;
  count: number;
  publishedAt: Date;
  work: TicketWorkSummary;
}

export interface WatchAchievement {
  workId: number;
  count: number;
  createdAt: Date;
  episode: {
    count: number;
    workId: number;
    work: {
      title: string;
      durationMin: number;
      officialSiteUrl: string | null;
    };
  };
}
