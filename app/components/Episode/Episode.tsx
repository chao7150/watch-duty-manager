import { Link } from "@remix-run/react";
import { useMemo } from "react";
import { addMinutes } from "date-fns";
import { get4OriginDate } from "../../utils/date";

import * as WorkHashtagCopyButton from "../Work/WorkHashtagCopyButton";
import * as ExclamationCircleIcon from "../../components/Icons/ExclamationCircle";
import * as EpisodeActoinMenu from "./EpisodeActionMenu";
import { bindUrl as bindUrlForWorks$WorkId } from "../../routes/works.$workId";
import { bindUrl as bindUrlForWorks$WorkId$Count } from "../../routes/works.$workId.$count";

type Status = "published" | "onair" | "today" | "tomorrow";

type InformationProps = {
  workId: number;
  title: string;
  durationMin: number;
  count: number;
  /**
   * ISO8601
   */
  publishedAt: string;
  hashtag?: string;
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
  hashtag,
  watchReady,
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
        {watchReady === false && (
          <div className="icon" title="まだ前の話数を見ていません">
            <ExclamationCircleIcon.Component />
          </div>
        )}
      </h3>
      <div className="flex gap-1 items-center text-text-weak">
        <span className={timeStyle}>
          {new Date(publishedAt).toLocaleString()}
        </span>
        {durationMin !== 30 && (
          <span className="bg-accent-area px-0.5">{durationMin}分</span>
        )}
        {hashtag !== undefined && hashtag !== "" && (
          <WorkHashtagCopyButton.Component hashtag={hashtag} />
        )}
      </div>
    </div>
  );
};

const getStatus = (
  publishedAt: Date,
  now: Date
): "published" | "onair" | "today" | "tomorrow" => {
  if (addMinutes(publishedAt, 30) < now) {
    return "published";
  }
  if (publishedAt < now) {
    return "onair";
  }
  if (get4OriginDate(publishedAt) === get4OriginDate(now)) {
    return "today";
  }
  return "tomorrow";
};

const statusStyles: { [K in Status]: string } = {
  published: "",
  onair: "font-bold",
  today: "font-bold",
  tomorrow: "",
};

export type Props = Omit<InformationProps, "status"> & { watched: boolean };
const _Component: React.FC<Props> = ({
  workId,
  title,
  durationMin,
  count,
  publishedAt,
  hashtag,
  watchReady,
  watched,
}) => {
  const status = getStatus(new Date(publishedAt), new Date());
  return (
    <div className={`w-full grow ${statusStyles[status]} flex justify-between`}>
      <Information
        workId={workId}
        title={title}
        durationMin={durationMin}
        count={count}
        publishedAt={publishedAt}
        hashtag={hashtag}
        watchReady={watchReady}
        status={status}
      />
      {["published", "onair"].includes(status) && (
        <EpisodeActoinMenu.Component
          {...{
            workId,
            count,
            watched,
          }}
        />
      )}
    </div>
  );
};

export const Component = (props: Props) =>
  useMemo(() => <_Component {...props} />, [...Object.values(props)]);
