import { Link } from "@remix-run/react";

import { useMemo } from "react";

import { Temporal } from "temporal-polyfill";
import { bindUrl as bindUrlForWorks$WorkId$Count } from "~/routes/works.$workId.$count";
import { bindUrl as bindUrlForWorks$WorkId } from "~/routes/works.$workId/route";

import type { Status } from "~/domain/episode/consts";
import { getStatus } from "~/domain/episode/util";

import * as ExclamationCircleIcon from "~/components/Icons/ExclamationCircle";
import * as InformationIcon from "~/components/Icons/Information";

import { date2ZonedDateTime } from "~/utils/date";

import * as EpisodeActoinMenu from "./EpisodeActionMenu";

type InformationProps = {
  workId: number;
  title: string;
  durationMin: number;
  count: number;
  publishedAt: Date;
  watchReady?: boolean;
  status: Status;
  onClickWatchUnready: (workId: number) => void;
  delayed?: boolean;
};

const timeStyles: { [K in Status]: string } = {
  published: "",
  onair: "text-red",
  today: "text-text-strong",
  tomorrow: "",
};

const Information: React.FC<InformationProps> = ({
  workId,
  title,
  durationMin,
  count,
  publishedAt,
  status,
  watchReady,
  onClickWatchUnready,
  delayed,
}) => {
  const timeStyle = timeStyles[status];
  return (
    <div className="episode">
      <h3 className="flex items-center gap-1">
        <span className="hover:text-cadet-blue hover:underline">
          <Link to={bindUrlForWorks$WorkId({ workId })}>{title}</Link>
        </span>
        <span className="hover:text-cadet-blue hover:underline">
          <Link to={bindUrlForWorks$WorkId$Count({ workId, count })}>
            #{count}
          </Link>
        </span>
        {watchReady === false && (
          <button
            title="まだ前の話数を見ていません"
            onClick={() => onClickWatchUnready(workId)}
          >
            <ExclamationCircleIcon.Component />
          </button>
        )}
      </h3>
      <div className="flex gap-1 items-center text-text-weak">
        <span className={timeStyle}>{publishedAt.toLocaleString("ja")}</span>
        {delayed && (
          <div title="視聴遅延設定があります" className="w-5 h-5">
            <InformationIcon.Component />
          </div>
        )}
        {durationMin !== 30 && (
          <span className="bg-accent-area px-0.5">{durationMin}分</span>
        )}
      </div>
    </div>
  );
};

const statusStyles: { [K in Status]: string } = {
  published: "",
  onair: "font-bold",
  today: "font-bold",
  tomorrow: "",
};

export type Props = Omit<
  InformationProps & EpisodeActoinMenu.Props,
  "status" | "published"
>;
const _Component: React.FC<Props> = ({
  workId,
  officialSiteUrl,
  watchUrl,
  title,
  durationMin,
  count,
  publishedAt,
  hashtag,
  watchReady,
  watched,
  skipped,
  onClickWatchUnready,
  delayed,
}) => {
  const status = getStatus(
    // TODO: これでも同じじゃない？
    date2ZonedDateTime(publishedAt),
    Temporal.Now.zonedDateTimeISO("Asia/Tokyo"),
  );
  return (
    <div
      className={`w-full grow ${statusStyles[status]} flex justify-between `}
    >
      <Information
        workId={workId}
        title={title}
        durationMin={durationMin}
        count={count}
        publishedAt={publishedAt}
        watchReady={watchReady}
        status={status}
        onClickWatchUnready={onClickWatchUnready}
        delayed={delayed}
      />
      <EpisodeActoinMenu.Component
        {...{
          workId,
          officialSiteUrl,
          watchUrl,
          count,
          watched,
          skipped,
          hashtag,
          onClickWatchUnready,
          published: ["onair", "published"].includes(status),
        }}
      />
    </div>
  );
};

export const Component = (props: Props) =>
  useMemo(() => <_Component {...props} />, [...Object.values(props)]);
