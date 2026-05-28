import { useNavigation } from "react-router";
import urlFrom from "url-from";
import { episodeRepository } from "~/adapters/repository/prisma/episode";
import { workRepository } from "~/adapters/repository/prisma/work";
import * as CourSelect from "~/components/CourSelect";
import * as EpisodeFilter from "~/components/EpisodeFilter";
import { useDebouncedSearch } from "~/components/hooks/useDebouncedSearch";
import * as SearchInput from "~/components/SearchInput";
import * as WorkUI from "~/components/work/Work";
import type { Cour } from "~/domain/cour/consts";
import { cour2expression, cour2symbol, symbol2cour } from "~/domain/cour/util";
import type { WorksListItem } from "~/usecases/_shared/worksDto";
import { getAvailableCours } from "~/usecases/getAvailableCours";
import { getWorksList } from "~/usecases/getWorksList";
import { searchWorks } from "~/usecases/searchWorks";

import { getUserId } from "~/utils/session.server";

import type { Route } from "./+types/works._index";

export const bindUrl = urlFrom`/works`.narrowing<{
  "?query": { cour?: string; minEpisodes?: string; q?: string };
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
  const query = url.searchParams.get("q") ?? undefined;

  let works: WorksListItem[] = [];
  let searchedWorks:
    | {
        currentCourWorks: WorksListItem[];
        otherCourWorks: WorksListItem[];
      }
    | undefined;

  const getWorksPromise =
    query !== undefined && query.trim() !== ""
      ? searchWorks({
          episodeRepo: episodeRepository,
          workRepo: workRepository,
        })({
          userId,
          cour,
          minEpisodes,
          query,
        }).then((res) => {
          searchedWorks = res;
        })
      : getWorksList({
          episodeRepo: episodeRepository,
          workRepo: workRepository,
        })({
          userId,
          cour,
          minEpisodes,
        }).then((res) => {
          works = res;
        });

  const [_, courList] = await Promise.all([
    getWorksPromise,
    getAvailableCours({
      episodeRepo: episodeRepository,
    })(),
  ]);

  return {
    works,
    searchedWorks,
    loggedIn: userId !== undefined,
    courList,
    selectedCourDate: cour ? cour2symbol(cour) : undefined,
    selectedCourExpression: cour ? cour2expression(cour) : undefined,
    minEpisodes,
  };
};

export default function Works({ loaderData }: Route.ComponentProps) {
  const {
    works,
    searchedWorks,
    loggedIn,
    courList,
    selectedCourDate,
    selectedCourExpression,
    minEpisodes: _minEpisodes,
  } = loaderData;

  const { searchQuery, handleChange, hasQuery } = useDebouncedSearch({
    key: "q",
  });
  const navigation = useNavigation();

  // navigation の状態から、検索パラメータの更新によるロード中かどうかを判定
  const isSearching =
    navigation.state === "loading" &&
    (navigation.location?.search.includes("q=") || false);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
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
              url.searchParams.set("minEpisodes", _minEpisodes.toString());
              if (searchQuery.trim() !== "") {
                url.searchParams.set("q", searchQuery);
              }
              location.href = url.toString();
            }}
          />
          <EpisodeFilter.Component initialMinEpisodes={_minEpisodes} />
        </div>
        <SearchInput.Component
          value={searchQuery}
          onChange={handleChange}
          isSearching={isSearching}
          placeholder="作品名で検索..."
        />
      </div>

      {hasQuery ? (
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="text-text-strong font-semibold mb-2">
              選択中のクール「
              {selectedCourExpression ? selectedCourExpression : "全期間"}
              」の検索結果 (
              <span>{searchedWorks?.currentCourWorks.length ?? 0}</span>)
            </h3>
            {searchedWorks?.currentCourWorks.length === 0 ? (
              <p className="text-text-weak text-sm py-2">
                該当する作品はありません
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-1 mt-2">
                {searchedWorks?.currentCourWorks.map((work) => (
                  <li key={work.id}>
                    <WorkUI.Component
                      loggedIn={loggedIn}
                      id={work.id}
                      title={work.title}
                      subscribed={work.subscribed}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-text-strong font-semibold mb-2">
              その他の検索結果 (
              <span>{searchedWorks?.otherCourWorks.length ?? 0}</span>)
            </h3>
            {searchedWorks?.otherCourWorks.length === 0 ? (
              <p className="text-text-weak text-sm py-2">
                該当する作品はありません
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-1 mt-2">
                {searchedWorks?.otherCourWorks.map((work) => (
                  <li key={work.id}>
                    <WorkUI.Component
                      loggedIn={loggedIn}
                      id={work.id}
                      title={work.title}
                      subscribed={work.subscribed}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
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
      )}
    </div>
  );
}
