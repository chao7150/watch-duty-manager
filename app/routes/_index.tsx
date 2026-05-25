import { useEffect, useRef } from "react";
import { Link, useRevalidator } from "react-router";
import "firebase/compat/auth";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { metricsRepository } from "~/adapters/repository/prisma/metrics";
import { watchRepository } from "~/adapters/repository/prisma/watch";
import * as EpisodeList from "~/components/Episode/List";
import { setOldestOfWork } from "~/domain/ticket/compute";
import { getDashboard } from "~/usecases/getDashboard";
import { getUserId } from "~/utils/session.server";

import type { Route } from "./+types/_index";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const userId = await getUserId(request);
  if (userId === null) {
    return {
      userId,
      tickets: [],
      weekMetrics: [],
      quarterMetrics: [],
      recentWatchAchievements: [],
      nowMs: Date.now(),
      subscription: [],
    };
  }

  return getDashboard({
    watchRepo: watchRepository,
    metricsRepo: metricsRepository,
    userId,
  })();
};

export default function Index({ loaderData }: Route.ComponentProps) {
  const revalidator = useRevalidator();
  const lastUpdatedRef = useRef(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastUpdatedRef.current > 1000 * 60 * 5
      ) {
        revalidator.revalidate();
        lastUpdatedRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [revalidator]);
  const {
    userId,
    tickets,
    weekMetrics,
    quarterMetrics,
    recentWatchAchievements,
    subscription,
    nowMs,
  } = loaderData;

  if (userId === null) {
    return (
      <div>
        <Link to="/login">ログイン</Link>してください。
      </div>
    );
  }

  const unwatchedTickets = tickets.filter((ticket) => {
    return (
      ticket.publishedAt.getTime() +
        (subscription.find((s) => s.workId === ticket.workId)
          ?.watchDelaySecFromPublish ?? 0) *
          1000 <
      nowMs
    );
  });

  return (
    <div className="dashboard-page">
      <section>
        <header className="flex gap-2 ">
          <h2>未視聴のエピソード</h2>
          <h3 className="flex gap-1 items-center text-text-weak text-base">
            <span>{unwatchedTickets.length}本</span>
            <span>
              {unwatchedTickets
                .map((ticket) => ticket.work.durationMin)
                .reduce((acc, val) => acc + val, 0)}
              分
            </span>
          </h3>
        </header>
        <EpisodeList.Component
          episodes={setOldestOfWork([...tickets]).map((ticket) => {
            return {
              workId: ticket.workId,
              title: ticket.work.title,
              durationMin: ticket.work.durationMin,
              count: ticket.count,
              publishedAt: ticket.publishedAt,
              hashtag: ticket.work.hashtag ?? undefined,
              watchReady: ticket.watchReady,
              watched: false,
              officialSiteUrl: ticket.work.officialSiteUrl ?? "",
              watchUrl:
                subscription.find((s) => s.workId === ticket.workId)
                  ?.watchUrl ?? undefined,
            };
          })}
          workIdDelayMinList={subscription.map((d) => [
            d.workId,
            d.watchDelaySecFromPublish,
          ])}
          nowMs={nowMs}
        />
      </section>
      <section>
        <h2>最近のアニメ放送数と視聴数の推移</h2>
        <ResponsiveContainer height={300}>
          <LineChart data={weekMetrics}>
            <CartesianGrid />
            <XAxis dataKey="date" stroke="#bdc1c6" />
            <YAxis tickCount={3} stroke="#bdc1c6" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="watchAchievements" />
            <Line type="monotone" stroke="red" dataKey="dutyAccumulation" />
          </LineChart>
        </ResponsiveContainer>
        <ResponsiveContainer height={300}>
          <LineChart data={quarterMetrics}>
            <CartesianGrid />
            <XAxis dataKey="date" stroke="#bdc1c6" />
            <YAxis tickCount={5} stroke="#bdc1c6" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="watchAchievements" />
            <Line type="monotone" stroke="red" dataKey="dutyAccumulation" />
          </LineChart>
        </ResponsiveContainer>
        <h2 className="mt-4">最近見たエピソード</h2>
        <EpisodeList.Component
          episodes={recentWatchAchievements.map((a) => ({
            workId: a.workId,
            title: a.episode.work.title,
            durationMin: a.episode.work.durationMin,
            count: a.count,
            publishedAt: a.createdAt,
            watched: true,
            officialSiteUrl: a.episode.work.officialSiteUrl ?? "",
            watchUrl:
              subscription.find((s) => s.workId === a.workId)?.watchUrl ??
              undefined,
          }))}
          workIdDelayMinList={[]}
          useLocalStorage={false}
          nowMs={nowMs}
        />
      </section>
    </div>
  );
}
