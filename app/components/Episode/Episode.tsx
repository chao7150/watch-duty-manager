import { Link, useFetcher } from "remix";

import * as EpisodeActoinMenu from "./EpisodeActionMenu";

type InformationProps = {
  workId: number;
  title: string;
  count: number;
  /**
   * ISO8601
   */
  publishedAt: string;
};

const Information: React.VFC<InformationProps> = ({
  workId,
  title,
  count,
  publishedAt,
}) => {
  return (
    <>
      <h3>
        <Link to={`/works/${workId}`}>{title}</Link>{" "}
        <Link to={`/works/${workId}/${count}`}>#{count}</Link>
      </h3>
      <p>{new Date(publishedAt).toLocaleString()}</p>
    </>
  );
};

export type NewProps = InformationProps;
const New: React.VFC<NewProps> = ({ workId, title, count, publishedAt }) => {
  const fetcher = useFetcher();
  return (
    <div>
      <Information
        workId={workId}
        title={title}
        count={count}
        publishedAt={publishedAt}
      />
      <EpisodeActoinMenu.Component
        {...{
          workId,
          count,
          watched: false,
        }}
      />
    </div>
  );
};

export type WatchedProps = InformationProps & { comment?: string };

const Watched: React.VFC<WatchedProps> = ({
  workId,
  title,
  count,
  publishedAt,
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
