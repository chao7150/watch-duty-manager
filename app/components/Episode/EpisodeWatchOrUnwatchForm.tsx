import { useFetcher } from "remix";

export type Props = {
  workId: number;
  count: number;
  watched: boolean;
  withComment: boolean;
};

export const Component: React.VFC<Props> = ({
  workId,
  count,
  watched,
  withComment,
}) => {
  const fetcher = useFetcher();
  const action = watched ? "unwatch" : "watch";
  return (
    <fetcher.Form method="post" action={`/works/${workId}/${count}?index`}>
      {withComment && (
        <details>
          <summary></summary>
          <label>
            コメント
            <textarea name="comment"></textarea>
          </label>
        </details>
      )}
      <button type="submit" name="_action" value={action}>
        {action}
      </button>
    </fetcher.Form>
  );
};
