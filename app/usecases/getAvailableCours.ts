import { cour2expression, cour2symbol, getCourList } from "~/domain/cour/util";
import type { EpisodeRepository } from "~/domain/episode/repository";

export const getAvailableCours =
  (deps: { episodeRepo: EpisodeRepository }) =>
  async (now: Date = new Date()): Promise<[string, string][]> => {
    const oldestPublishedAt = await deps.episodeRepo.findOldestPublishedAt();
    const cours = getCourList(oldestPublishedAt, now);
    return cours.map(
      (c) => [cour2expression(c), cour2symbol(c)] as [string, string],
    );
  };
