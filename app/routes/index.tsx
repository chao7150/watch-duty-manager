import { Channel, Episode, Program, Work } from ".prisma/client";
import { DataFunctionArgs } from "@remix-run/server-runtime";
import { format, formatISO, parseISO } from "date-fns";
import type { MetaFunction, LoaderFunction } from "remix";
import { useLoaderData } from "remix";
import { db } from "~/utils/db.server";
import * as EpisodeTimeline from "../components/domain/episode-timeline/EpisodeTimeline";

type IndexData = {
  backlog: ReadonlyArray<
    Omit<Program, "releasedAt"> & { releasedAt: string } & {
      channel: Channel;
      episode: Episode & {
        work: Work;
      };
    }
  >;
};

// TODO DBから過去と未来の未視聴番組を取得し放送開始時間でソートして返す
export const loader = async (args: DataFunctionArgs): Promise<IndexData> => {
  const programs = await db.program.findMany({
    include: { episode: { include: { work: true } }, channel: true },
  });
  return {
    backlog: programs.map((program) => ({
      ...program,
      releasedAt: formatISO(program.releasedAt),
    })),
  };
};

// https://remix.run/api/conventions#meta
export const meta: MetaFunction = () => {
  return {
    title: "Watch duty manager",
    description: "Welcome to remix!",
  };
};

// https://remix.run/guides/routing#index-routes
export default function Index() {
  const data = useLoaderData<IndexData>();
  const { backlog } = data;

  return (
    <div className="remix__page">
      <div className="backlog_timeline">
        <EpisodeTimeline.Component
          title={"未視聴"}
          episodes={backlog.map((program) => ({
            id: program.id.toString(),
            iconUrl: program.episode.work.imageUrl,
            title: program.episode.work.title,
            count: program.episode.count.toString(),
            episodeTitle: program.episode.title,
            channel: program.channel.name,
            startAt: format(parseISO(program.releasedAt), "MM/dd HH:mm"),
          }))}
        />
      </div>
      <div className="graph"></div>
      <div className="watched_timeline"></div>
    </div>
  );
}
