import type { LoaderFunctionArgs } from "@remix-run/node";
import { data } from "@remix-run/node";
import {
  Form,
  Link,
  Outlet,
  useLoaderData,
  useMatches,
} from "@remix-run/react";

import { Fragment, useCallback, useEffect, useState } from "react";

import * as E from "fp-ts/lib/Either.js";
import * as TE from "fp-ts/lib/TaskEither.js";
import * as F from "fp-ts/lib/function.js";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";
import urlFrom from "url-from";

import * as EpisodeWatchForm from "~/components/Episode/WatchForm";
import * as CloseIcon from "~/components/Icons/Close";
import * as EditIcon from "~/components/Icons/Edit";
import * as TrashIcon from "~/components/Icons/Trash";
import * as EditModeToggle from "~/components/EditModeToggle";
import { serverAction as WatchSettingsEditFormServerAction } from "~/components/watch-settings-edit-form/action.server";
import { Component as WatchSettingsEditFormComponent } from "~/components/watch-settings-edit-form/component";
import { EpisodeDateRegistrationTabPanel } from "~/components/work-create-form/component";
import { serverAction as WorkEditFormServerAction } from "~/components/work-edit-form/action.server";
import {
  Component as WorkEditFormComponent,
  type Props as WorkEditFormProps,
} from "~/components/work-edit-form/component";
import * as WorkSubscribeForm from "~/components/work/WorkSubscribeForm";
import * as Work from "~/components/work/component";

import { db } from "~/utils/db.server";
import { getUserId, requireUserId } from "~/utils/session.server";
import { extractParams, isNumber } from "~/utils/type";
import { isValidUrlString } from "~/utils/validator";

export const bindUrl = urlFrom`/works/${"workId:number"}`;

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const userId = (await getUserId(request)) ?? undefined;
  const { workId } = extractParams(params, ["workId"]);
  const workPromise = db.work.findUnique({
    where: { id: parseInt(workId, 10) },
    include: {
      users: {
        where: { userId },
      },
      episodes: {
        orderBy: { count: "asc" },
        ...(userId
          ? {
              include: {
                WatchedEpisodesOnUser: {
                  where: { userId },
                  select: { createdAt: true, rating: true },
                },
              },
            }
          : {}),
      },
    },
  });
  const subscriptionPromise =
    userId !== undefined
      ? db.subscribedWorksOnUser.findUnique({
          where: { userId_workId: { userId, workId: parseInt(workId, 10) } },
          select: { watchDelaySecFromPublish: true, watchUrl: true },
        })
      : Promise.resolve(undefined);
  const ratingsPromise =
    userId !== undefined
      ? db.watchedEpisodesOnUser.findMany({
          select: {
            episode: {
              select: {
                count: true,
              },
            },
            rating: true,
          },
          where: {
            workId: parseInt(workId, 10),
            userId,
          },
          orderBy: {
            episode: {
              count: "asc",
            },
          },
        })
      : Promise.resolve([]);
  const [work, subscription, ratings] = await Promise.all([
    workPromise,
    subscriptionPromise,
    ratingsPromise,
  ]);
  if (work === null) {
    throw Error("work not found");
  }
  if (userId === undefined) {
    return {
      work,
      rating: 0,
      ratings: [],
      subscribed: false,
      loggedIn: false,
      workTags: [],
      userTags: [],
    };
  }
  const map = new Map<number, number | null>();
  ratings.forEach((r) => {
    map.set(r.episode.count, r.rating);
  });
  const nonNullRatings = ratings.map((r) => r.rating).filter(isNumber);

  return {
    // usersを残すと誰が視聴しているかpublicに見えてしまうので消す
    work: { ...work, users: undefined },
    rating:
      nonNullRatings.length === 0
        ? 0
        : nonNullRatings.reduce((acc, val) => acc + val, 0) /
          nonNullRatings.length,
    ratings: Array.from({ length: work.episodes.length }).map((_, idx) => {
      return { count: idx + 1, rating: map.get(idx + 1) ?? null };
    }),
    subscribed: work?.users.length === 1,
    loggedIn: userId !== undefined,
    delay: subscription?.watchDelaySecFromPublish ?? undefined,
    url: subscription?.watchUrl ?? undefined,
  };
};

export const action = async ({ request, params }: LoaderFunctionArgs) => {
  const { workId: _workId } = extractParams(params, ["workId"]);
  const workId = parseInt(_workId, 10);

  const formData = await request.formData();
  if (formData.get("_action") === "delete") {
    const { count: _count } = extractParams(Object.fromEntries(formData), [
      "count",
    ]);
    const count = parseInt(_count, 10);
    await db.$transaction([
      db.episode.delete({
        where: { workId_count: { workId, count } },
      }),
      db.episode.updateMany({
        where: { workId, count: { gt: count } },
        data: { count: { decrement: 1 } },
      }),
    ]);
    return data({ message: "success", hasError: false }, { status: 200 });
  }
  if (formData.get("_action") === "addEpisodes") {
    const { episodeDate: _episodeDate, offset: _offset } = extractParams(
      Object.fromEntries(formData),
      ["episodeDate", "offset"],
    );
    const episodeDate = _episodeDate.split(",").map((d) => new Date(d));
    const offset = parseInt(_offset, 10);
    await db.episode.createMany({
      data: episodeDate.map((date, index) => ({
        count: offset + index,
        workId,
        publishedAt: date,
      })),
    });
    return data({ message: "success", hasError: false }, { status: 200 });
  }
  if (formData.get("_action") === "unsubscribe") {
    const userId = await requireUserId(request);
    await db.subscribedWorksOnUser.delete({
      where: { userId_workId: { userId, workId } },
    });
    return data({ message: "success", hasError: false }, { status: 200 });
  }
  if (formData.get("_action") === "subscribe") {
    const userId = await requireUserId(request);

    try {
      const rel = await db.subscribedWorksOnUser.create({
        data: {
          userId,
          workId,
        },
      });
      return data(
        { message: `${rel.userId} ${rel.workId} ok`, hasError: false },
        { status: 200 },
      );
    } catch (_) {
      return data({ message: "db error", hasError: true }, { status: 400 });
    }
  }
  if (formData.get("_action") === "watch-settings-edit") {
    const userId = await requireUserId(request);
    return await F.pipe(
      WatchSettingsEditFormServerAction(userId, workId, formData),
      TE.match(
        ({ errorMessage, status }) =>
          data({ message: errorMessage, hasError: true }, { status }),
        ({ successMessage, status }) =>
          data({ message: successMessage, hasError: false }, { status }),
      ),
    )();
  }
  // _action === "edit"
  return F.pipe(
    await WorkEditFormServerAction(workId, formData),
    E.match(
      ({ errorMessage, status }) =>
        data({ message: errorMessage, hasError: true }, { status }),
      ({ successMessage, status }) =>
        data({ message: successMessage, hasError: false }, { status }),
    ),
  );
};

// loader関数の戻り値の型を定義
type LoaderData = Awaited<ReturnType<typeof loader>>;

/**
 * 作品情報表示・編集用コンポーネント
 * 作品のタイトル、詳細情報などを表示し、必要に応じて編集モードを切り替えられる
 */
function WorkInfoSection({
  work,
}: {
  /** 作品の基本情報 */
  work: LoaderData["work"];
}) {
  const [editMode, setEditMode] = useState(false);
  const turnEditMode = useCallback(() => setEditMode((s) => !s), []);

  const defaultValueMap: WorkEditFormProps = {
    workId: work.id,
    workInput: {
      workTitle: { defaultValue: work.title ?? "" },
      durationMin: { defaultValue: work.durationMin },
      officialSiteUrl: { defaultValue: work.officialSiteUrl ?? "" },
      twitterId: { defaultValue: work.twitterId ?? "" },
      hashtag: { defaultValue: work.hashtag ?? "" },
    },
    onSubmitSuccess: () => {
      setEditMode(false);
    },
  };

  return (
    <section className={`${editMode ? "col-span-2" : ""}`}>
      <header className="flex">
        <h3>作品情報</h3>
        <EditModeToggle.Component editMode={editMode} turnEditMode={turnEditMode} />
      </header>
      {editMode ? (
        <WorkEditFormComponent {...defaultValueMap} />
      ) : (
        <Work.Component
          {...{
            ...work,
            officialSiteUrl: work.officialSiteUrl ?? undefined,
            twitterId: work.twitterId ?? undefined,
            hashtag: work.hashtag ?? undefined,
          }}
        />
      )}
    </section>
  );
}

/**
 * 視聴設定表示・編集用コンポーネント
 * 視聴する際の遅延時間や視聴URLなどの設定を表示・編集する
 */
function WatchSettingsSection({
  workId,
  delay,
  url,
}: {
  /** 作品ID */
  workId: number;
  /** 視聴遅延時間（秒） */
  delay: number | undefined;
  /** 視聴URL */
  url: string | undefined;
}) {
  const [watchSettingsEditMode, setWatchSettingsEditMode] = useState(false);
  const toggleWatchSettingsEditMode = useCallback(
    () => setWatchSettingsEditMode((s) => !s),
    [],
  );

  return (
    <section>
      <header className="flex">
        <h3>視聴設定</h3>
        <EditModeToggle.Component editMode={watchSettingsEditMode} turnEditMode={toggleWatchSettingsEditMode} />
      </header>
      {watchSettingsEditMode ? (
        <WatchSettingsEditFormComponent
          workId={workId}
          defaultValue={{ delayMin: delay && delay / 60, url }}
          onSubmitSuccess={toggleWatchSettingsEditMode}
        />
      ) : (
        <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
          <dt>視聴遅延</dt>
          <dd>
            {delay === undefined
              ? "なし"
              : `${Math.floor(delay / 86400)}日${Math.floor(
                  (delay % 86400) / 3600,
                )
                  .toString()
                  .padStart(
                    2,
                    "0",
                  )}時間${((delay / 60) % 60).toString().padStart(2, "0")}分`}
          </dd>
          <dt>視聴リンク</dt>
          <dd>
            {isValidUrlString(url) ? (
              <Link to={url} target="_blank">
                {url}
              </Link>
            ) : (
              url
            )}
          </dd>
        </dl>
      )}
    </section>
  );
}

/**
 * 評価グラフ表示用コンポーネント
 * 各エピソードの評価値をグラフ化して表示する
 */
function RatingChartSection({
  ratings,
}: {
  /** 各エピソードの評価データ配列 */
  ratings: LoaderData["ratings"];
}) {
  return (
    <section className="flex-1">
      <ResponsiveContainer height={300}>
        <LineChart data={ratings}>
          <CartesianGrid />
          <XAxis dataKey="count" domain={[1, "dataMax"]} />
          <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
          <Tooltip />
          <Line type="monotone" dataKey="rating" />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}

// エピソード型定義
type Episode = LoaderData["work"]["episodes"][number];

/**
 * エピソード行コンポーネント
 * エピソードの基本情報を表示し、視聴状態の変更や削除などのアクションを提供する
 */
function EpisodeRow({
  episode,
  outletId,
  episodesEditMode,
  loggedIn,
}: {
  /** エピソードデータ */
  episode: Episode;
  /** 現在表示中のエピソードID（アウトレットで表示） */
  outletId?: number;
  /** エピソード編集モードかどうか */
  episodesEditMode: boolean;
  /** ユーザーがログイン中かどうか */
  loggedIn: boolean;
}) {
  const linkTo = outletId === episode.count ? "." : `${episode.count}`;

  return (
    <Fragment key={`${episode.workId}-${episode.count}`}>
      <li
        className={`col-span-4 grid grid-cols-subgrid ${outletId === episode.count ? "bg-accent-area" : ""}`}
      >
        <div>
          <Link to={linkTo} preventScrollReset={true}>
            {episode.count}
          </Link>
        </div>
        <div>
          <Link to={linkTo} preventScrollReset={true}>
            {new Date(episode.publishedAt).toLocaleDateString("ja")}
          </Link>
        </div>
        <div>
          {new Date(episode.publishedAt) < new Date() && loggedIn && (
            <EpisodeWatchForm.Component
              workId={episode.workId}
              count={episode.count}
              watched={
                // @ts-expect-error クエリを動的に動的に生成しているので型がついていない
                episode.WatchedEpisodesOnUser
                  ? // @ts-expect-error クエリを動的に動的に生成しているので型がついていない
                    episode.WatchedEpisodesOnUser.length >= 1
                  : false
              }
            />
          )}
        </div>
        {episodesEditMode && (
          <div className="align-middle h-6">
            <Form method="POST">
              <input type="hidden" name="count" value={episode.count} />
              <button
                className="align-middle"
                type="submit"
                name="_action"
                value="delete"
                title=""
              >
                <TrashIcon.Component />
              </button>
            </Form>
          </div>
        )}
      </li>
      {outletId === episode.count && (
        <div className="col-start-5 col-end-6 row-span-10">
          <Outlet />
        </div>
      )}
    </Fragment>
  );
}

/**
 * 放送スケジュール表示・編集用コンポーネント
 * 作品の全エピソードリストを表示し、新規エピソードの追加や削除機能を提供する
 */
function BroadcastScheduleSection({
  work,
  outletId,
}: {
  /** 作品情報とログイン状態 */
  work: LoaderData["work"] & { loggedIn: boolean };
  /** 現在表示中のエピソードID */
  outletId: number | undefined;
}) {
  const [episodesEditMode, setEpisodesEditMode] = useState(false);
  const [appendEpisodeOffset, setAppendEpisodeOffset] = useState(
    Math.max(...work.episodes.map((e) => e.count)) + 1,
  );

  useEffect(() => {
    setAppendEpisodeOffset(Math.max(...work.episodes.map((e) => e.count)) + 1);
  }, [work.episodes]);

  return (
    <section>
      <header className="flex">
        <h3>放送スケジュール</h3>
        <button
          className="ml-2"
          type="button"
          onClick={() => setEpisodesEditMode((c) => !c)}
        >
          {episodesEditMode && outletId === undefined ? (
            <CloseIcon.Component />
          ) : (
            <EditIcon.Component />
          )}
        </button>
      </header>
      <div className="flex flex-row gap-4 mt-4 relative">
        <section>
          <ul className="mt-2 grid grid-cols-[2.25rem_10ch_24px_auto] gap-x-1">
            {/* ヘッダー */}
            <li className="col-span-3 grid grid-cols-subgrid">
              <div>話数</div>
              <div>公開日</div>
              <div></div>
            </li>

            {work.episodes.map((episode) => (
              <EpisodeRow
                key={`${episode.workId}-${episode.count}`}
                episode={episode}
                outletId={outletId}
                episodesEditMode={episodesEditMode && outletId === undefined}
                loggedIn={work.loggedIn}
              />
            ))}
          </ul>
        </section>
        {episodesEditMode && outletId === undefined && (
          <section>
            <h4>話数を追加する</h4>
            <Form method="POST">
              <ul className="mt-2 flex flex-col gap-2">
                <li>
                  <label>
                    <div>追加する最初の話数カウント</div>
                    <input
                      type="number"
                      name="offset"
                      value={appendEpisodeOffset}
                      onChange={(e) => {
                        setAppendEpisodeOffset(e.target.valueAsNumber);
                      }}
                    />
                  </label>
                </li>
                <li>
                  <EpisodeDateRegistrationTabPanel
                    lastEpisodeDate={
                      work.episodes.length > 0
                        ? new Date(
                            work.episodes[work.episodes.length - 1].publishedAt,
                          )
                        : undefined
                    }
                  />
                </li>
                <li>
                  <button
                    className="bg-accent-area rounded-full py-1 px-3"
                    type="submit"
                    name="_action"
                    value="addEpisodes"
                  >
                    送信
                  </button>
                </li>
              </ul>
            </Form>
          </section>
        )}
      </div>
    </section>
  );
}

export default function Component() {
  const { loggedIn, work, subscribed, rating, ratings, delay, url } =
    useLoaderData<typeof loader>();
  const countMatch = useMatches().find(
    (m) => m.id === "routes/works.$workId.$count",
  );
  const outletId = countMatch && Number(countMatch.params.count);

  return (
    <div>
      <div className="flex">
        <h2 className="flex items-center">
          <Link to={bindUrl({ workId: work.id })}>{work.title}</Link>
        </h2>
        {loggedIn && (
          <>
            <div className="ml-4">
              <WorkSubscribeForm.Component
                id={work.id.toString()}
                subscribing={subscribed}
              />
            </div>
            <div className="ml-4 flex items-center">
              <div>{rating.toFixed(1)}</div>
            </div>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-8 pt-8">
        <div className="flex flex-col justify-between gap-4">
          <div className="grid grid-cols-2 gap-4">
            <WorkInfoSection work={work} />
            {subscribed && (
              <WatchSettingsSection workId={work.id} delay={delay} url={url} />
            )}
          </div>
          <RatingChartSection ratings={ratings} />
        </div>
        <BroadcastScheduleSection
          work={{ ...work, loggedIn }}
          outletId={outletId}
        />
      </div>
    </div>
  );
}
