import { Link, useFetcher } from "remix";
import { get4OriginDate } from "../../utils/date";

import * as EpisodeActoinMenu from "./EpisodeActionMenu";
import * as WorkHashtagCopyButton from "../Work/WorkHashtagCopyButton";

type InformationProps = {
  workId: number;
  title: string;
  count: number;
  /**
   * ISO8601
   */
  publishedAt: string;
  hashtag?: string;
};

const Information: React.VFC<InformationProps> = ({
  workId,
  title,
  count,
  publishedAt,
  hashtag,
}) => {
  return (
    <>
      <h3>
        <Link to={`/works/${workId}`}>{title}</Link>{" "}
        <Link to={`/works/${workId}/${count}`}>#{count}</Link>
      </h3>
      <div className="episode-information-additional-area">
        <span>{new Date(publishedAt).toLocaleString()}</span>
        {hashtag !== undefined && hashtag !== "" && (
          <WorkHashtagCopyButton.Component hashtag={hashtag} />
        )}
      </div>
    </>
  );
};

const getStatus = (
  publishedAt: Date,
  now: Date
): "published" | "today" | "tomorrow" => {
  if (publishedAt < now) {
    return "published";
  }
  if (get4OriginDate(publishedAt) === get4OriginDate(now)) {
    return "today";
  }
  return "tomorrow";
};

export type NewProps = InformationProps;
const New: React.VFC<NewProps> = ({
  workId,
  title,
  count,
  publishedAt,
  hashtag,
}) => {
  const status = getStatus(new Date(publishedAt), new Date());
  return (
    <div className="episode" data-status={status}>
      <Information
        workId={workId}
        title={title}
        count={count}
        publishedAt={publishedAt}
        hashtag={hashtag}
      />
      {status === "published" && (
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
            <summary>????????????</summary>
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
