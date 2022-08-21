import { Link, useFetcher } from "remix";
import { get4OriginDate } from "../../utils/date";

import * as EpisodeActoinMenu from "./EpisodeActionMenu";
import * as WorkHashtagCopyButton from "../Work/WorkHashtagCopyButton";
import * as EpisodeWatchNotReadyIcon from "./EpisodeWatchNotReadyIcon";
import { useMemo } from "react";
import { addMinutes } from "date-fns";

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
};

const Information: React.VFC<InformationProps> = ({
  workId,
  title,
  count,
  publishedAt,
  hashtag,
  watchReady,
}) => {
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
            <EpisodeWatchNotReadyIcon.Component />
          </div>
        )}
      </h3>
      <div className="episode-information-additional-area text-text-weak">
        <span>{new Date(publishedAt).toLocaleString()}</span>
        {hashtag !== undefined && hashtag !== "" && (
          <WorkHashtagCopyButton.Component hashtag={hashtag} />
        )}
      </div>
    </div>
  );
};

type Status = "published" | "onair" | "today" | "tomorrow";

const getStatusStyle = (
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
  onair: "bg-accent-area",
  today: "",
  tomorrow: "",
};

export type NewProps = InformationProps;
const _New: React.VFC<NewProps> = ({
  workId,
  title,
  count,
  publishedAt,
  hashtag,
  watchReady,
}) => {
  const status = getStatusStyle(new Date(publishedAt), new Date());
  return (
    <div className={`w-full grow ${statusStyles[status]}`}>
      <Information
        workId={workId}
        title={title}
        count={count}
        publishedAt={publishedAt}
        hashtag={hashtag}
        watchReady={watchReady}
      />
      {["published", "onair"].includes(status) && (
        <EpisodeActoinMenu.Component
          {...{
            workId,
            count,
            watched: false,
          }}
        />
      )}
    </div>
  );
};

const New = (props: NewProps) =>
  useMemo(() => <_New {...props} />, [...Object.values(props)]);

export type WatchedProps = InformationProps & { comment?: string };

const Watched: React.VFC<WatchedProps> = ({
  workId,
  title,
  count,
  publishedAt,
  hashtag,
  comment,
}) => {
  const fetcher = useFetcher();
  return (
    <div>
      <Information
        workId={workId}
        title={title}
        count={count}
        publishedAt={publishedAt}
        hashtag={hashtag}
      />
      <fetcher.Form method="post" action={`/works/${workId}/${count}?index`}>
        {comment && (
          <details>
            <summary>コメント</summary>
            <label>
              <pre>{comment}</pre>
            </label>
          </details>
        )}
        <button type="submit" name="_action" value="unwatch">
          unwatch
        </button>
      </fetcher.Form>
    </div>
  );
};

export const Component = { New, Watched };
