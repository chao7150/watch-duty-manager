import { Form, Link, Outlet } from "@remix-run/react";

import { useState, useEffect, Fragment } from "react";

import * as Button from "~/components/Button";
import * as EpisodeWatchForm from "~/components/Episode/WatchForm";
import * as CloseIcon from "~/components/Icons/Close";
import * as EditIcon from "~/components/Icons/Edit";
import * as TrashIcon from "~/components/Icons/Trash";
import { EpisodeDateRegistrationTabPanel } from "~/components/work-create-form/component";

import { LoaderData } from "../server/loader";

/**
 * 放送スケジュール表示・編集用コンポーネント
 * 作品の全エピソードリストを表示し、新規エピソードの追加や削除機能を提供する
 */
export const Component = ({
  work,
  outletId,
}: {
  /** 作品情報とログイン状態 */
  work: LoaderData["work"] & { loggedIn: boolean };
  /** 現在表示中のエピソードID */
  outletId: number | undefined;
}) => {
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
                  <Button.Component
                    type="submit"
                    name="_action"
                    value="addEpisodes"
                  >
                    送信
                  </Button.Component>
                </li>
              </ul>
            </Form>
          </section>
        )}
      </div>
    </section>
  );
};

// エピソード型定義
type EpisodeStatus = {
  status: "watched" | "skipped";
};
// loader.tsのクエリによって`EpisodeStatusOnUser`が追加されるが、
// LoaderData型にその情報が自動的に反映されないため、ここで手動で型を拡張している。
// ログインしていない場合はこのプロパティは存在しないため、オプショナル（?）にしている。
type Episode = LoaderData["work"]["episodes"][number] & {
  EpisodeStatusOnUser?: EpisodeStatus[];
};
/**
 * エピソード行コンポーネント
 * エピソードの基本情報を表示し、視聴状態の変更や削除などのアクションを提供する
 */
const EpisodeRow = ({
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
}) => {
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
                episode.EpisodeStatusOnUser
                  ? episode.EpisodeStatusOnUser.some(
                      (status) => status.status === "watched",
                    )
                  : false
              }
              skipped={
                episode.EpisodeStatusOnUser
                  ? episode.EpisodeStatusOnUser.some(
                      (status) => status.status === "skipped",
                    )
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
};
