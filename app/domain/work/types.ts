export interface WorkInput {
  title: string;
  publishedAt: Date;
  durationMin?: number;
  officialSiteUrl?: string | null;
  twitterId?: string | null;
  hashtag?: string | null;
}

export interface WorkUpdateInput {
  title?: string;
  officialSiteUrl?: string | null;
  twitterId?: string | null;
  hashtag?: string | null;
  durationMin?: number;
}

export interface WorkCore {
  id: number;
  title: string;
  publishedAt: Date;
  durationMin: number;
  officialSiteUrl: string | null;
  twitterId: string | null;
  hashtag: string | null;
}

export interface WorkEpisode {
  count: number;
  publishedAt: Date;
  title: string | null;
  description: string | null;
  EpisodeStatusOnUser?: {
    createdAt: Date;
    rating: number | null;
    status: string;
  }[];
}

export interface WorkDetail extends WorkCore {
  episodes?: WorkEpisode[];
  users?: { userId: string }[];
}

export interface WorkListItem extends WorkCore {
  episodes?: { count: number }[];
  users?: { userId: string }[];
}

export interface WorkTitleRecord {
  id: number;
  title: string;
}

export interface BulkWorkInput {
  title: string;
  publishedAt: Date;
  episodeCount: number;
  officialSiteUrl?: string;
  twitterId?: string;
  hashtag?: string;
}

export interface DashboardWorkEpisode {
  count: number;
  publishedAt: Date;
  status: {
    rating: number | null;
    createdAt: Date;
  } | null;
}

export interface DashboardWork extends Pick<WorkCore, "id" | "title"> {
  episodes: DashboardWorkEpisode[];
}

export interface DashboardWorkWithStats extends DashboardWork {
  rating: number;
  completeCount: number;
  watchedEpisodesDenominator: number;
}
