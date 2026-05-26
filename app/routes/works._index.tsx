import urlFrom from "url-from";
import { episodeRepository } from "~/adapters/repository/prisma/episode";
import { workRepository } from "~/adapters/repository/prisma/work";
import * as CourSelect from "~/components/CourSelect";
import * as EpisodeFilter from "~/components/EpisodeFilter";
import * as WorkUI from "~/components/work/Work";
import type { Cour } from "~/domain/cour/consts";
import { symbol2cour } from "~/domain/cour/util";
import { getWorksList } from "~/usecases/getWorksList";

import { getUserId } from "~/utils/session.server";

import type { Route } from "./+types/works._index";

export const bindUrl = urlFrom`/works`.narrowing<{
  "?query": { cour?: string; minEpisodes?: string };
}>;

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const userId = await getUserId(request);
  const courString = url.searchParams.get("cour");
  let cour: Cour | null;
  if (courString === null) {
    cour = null;
  } else {
    cour = symbol2cour(courString) ?? null;
    if (cour === null) {
      throw new Error("cour is invalid.");
    }
  }
  const minEpisodes = Number(url.searchParams.get("minEpisodes") ?? "3");

  const result = await getWorksList({
    episodeRepo: episodeRepository,
    workRepo: workRepository,
  })({
    userId,
    cour,
    minEpisodes,
  });

  return {
    works: result.works,
    loggedIn: userId !== undefined,
    courList: result.courList,
    selectedCourDate: result.selectedCourDate ?? undefined,
    minEpisodes: result.minEpisodes,
  };
};

export default function Works({ loaderData }: Route.ComponentProps) {
  const {
    works,
    loggedIn,
    courList,
    selectedCourDate,
    minEpisodes: _minEpisodes,
  } = loaderData;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2>作品リスト</h2>
        <CourSelect.Component
          courList={[...courList].reverse()}
          defaultSelectedValue={selectedCourDate ?? undefined}
          onChange={(e) => {
            const value = e.target.value;
            const url = new URL(window.location.href);
            if (value === "all") {
              url.searchParams.delete("cour");
            } else {
              url.searchParams.set("cour", value);
            }
            // minEpisodes は維持する
            url.searchParams.set("minEpisodes", _minEpisodes.toString());
            location.href = url.toString();
          }}
        />
        <EpisodeFilter.Component initialMinEpisodes={_minEpisodes} />
      </div>
      <section>
        <h3>
          作品(<span>{works.length}</span>)
        </h3>
        <ul className="grid grid-cols-2 gap-1 mt-2">
          {works.map((work) => {
            return (
              <li key={work.id}>
                <WorkUI.Component
                  loggedIn={loggedIn}
                  id={work.id}
                  title={work.title}
                  subscribed={work.subscribed}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
