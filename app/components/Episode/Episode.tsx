import { Link } from "@remix-run/react";
import { useMemo } from "react";

import * as EpisodeActoinMenu from "./EpisodeActionMenu";
import { bindUrl as bindUrlForWorks$WorkId } from "../../routes/works.$workId";
import { bindUrl as bindUrlForWorks$WorkId$Count } from "../../routes/works.$workId.$count";
import { Status } from "~/domain/episode/consts";
import { getStatus } from "~/domain/episode/util";

type InformationProps = {
  workId: number;
  title: string;
  durationMin: number;
  count: number;
  /**
   * ISO8601
   */
  publishedAt: string;
  watchReady?: boolean;
  status: Status;
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
}) => {
  const timeStyle = timeStyles[status];
  return (
    <div className="episode">
      <h3 className="episode-heading">
        <div className="hover:text-cadet-blue hover:underline">
          <Link to={bindUrlForWorks$WorkId({ workId })}>{title}</Link>
        </div>
        <div className="hover:text-cadet-blue hover:underline">
          <Link to={bindUrlForWorks$WorkId$Count({ workId, count })}>
            #{count}
          </Link>
        </div>
      </h3>
      <div className="flex gap-1 items-center text-text-weak">
        <span className={timeStyle}>
          {new Date(publishedAt).toLocaleString()}
        </span>
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
  title,
  durationMin,
  count,
  publishedAt,
  hashtag,
  watchReady,
  watched,
  onClickWatchUnready,
}) => {
  const status = getStatus(new Date(publishedAt), new Date());
  return (
    <div className={`w-full grow ${statusStyles[status]} flex justify-between hover:bg-accent-area`}>
      <Information
        workId={workId}
        title={title}
        durationMin={durationMin}
        count={count}
        publishedAt={publishedAt}
        watchReady={watchReady}
        status={status}
      />
      <EpisodeActoinMenu.Component
        {...{
          workId,
          officialSiteUrl,
          count,
          watched,
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
