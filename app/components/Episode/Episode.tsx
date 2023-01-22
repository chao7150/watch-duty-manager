import { Link } from "@remix-run/react";
import { useMemo } from "react";
import { addMinutes } from "date-fns";
import { get4OriginDate } from "../../utils/date";

import * as WorkHashtagCopyButton from "../Work/WorkHashtagCopyButton";
import * as ExclamationCircleIcon from "../../components/Icons/ExclamationCircle";
import * as EpisodeActoinMenu from "./EpisodeActionMenu";

type Status = "published" | "onair" | "today" | "tomorrow";

type InformationProps = {
  workId: number;
  title: string;
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

const Information: React.VFC<InformationProps> = ({
  workId,
  title,
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
          <Link to={`/works/${workId}`}>{title}</Link>
        </div>
        <div className="hover:text-cadet-blue hover:underline">
          <Link to={`/works/${workId}/${count}`}>#{count}</Link>
        </div>
        {watchReady === false && (
          <div className="icon" title="まだ前の話数を見ていません">
            <ExclamationCircleIcon.Component />
          </div>
        )}
      </h3>
      <div className="episode-information-additional-area text-text-weak">
        <span className={timeStyle}>
          {new Date(publishedAt).toLocaleString()}
        </span>
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
const _Component: React.VFC<Props> = ({
  workId,
  title,
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
