import type { MetaFunction, LoaderFunction } from "remix";
import { useLoaderData, json, Link } from "remix";
import * as EpisodeTimeline from "../components/domain/episode-timeline/EpisodeTimeline";

type IndexData = {
  backlog: Array<{ name: string; url: string }>;
};

// TODO DBから過去と未来の未視聴番組を取得し放送開始時間でソートして返す
export const loader: LoaderFunction = () => {
  return {
    backlog: [
      {
        name: "ビルディバイド -#000000-",
        url: "https://anime.build-divide.com",
      },
    ],
  };
};

// https://remix.run/api/conventions#meta
export const meta: MetaFunction = () => {
  return {
    title: "Remix Starter",
    description: "Welcome to remix!",
  };
};

// https://remix.run/guides/routing#index-routes
export default function Index() {
  const data = useLoaderData<IndexData>();
  const { backlog, ...props } = data;

  return (
    <div className="remix__page">
      <div className="backlog_timeline">
        <EpisodeTimeline.Component
          title="未視聴のアニメ"
          episodes={Array.from({ length: 5 }).map((episode) => ({
            title: "ビルディバイド -#000000-",
            count: "1",
            id: "1",
            iconUrl:
              "https://pbs.twimg.com/profile_images/1383945655689699338/31yNVcqM_400x400.jpg",
            startAt: "1111",
            endAt: "2222",
          }))}
        />
      </div>
      <div className="graph"></div>
      <div className="watched_timeline"></div>
    </div>
  );
}
