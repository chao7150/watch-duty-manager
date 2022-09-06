import { useFetcher } from "@remix-run/react";

export type Props = {
  workId: number;
  count: number;
  watched: boolean;
};

export const Component: React.VFC<Props> = ({ workId, count, watched }) => {
  const fetcher = useFetcher();
  const action = watched ? "unwatch" : "watch";
  return (
    <fetcher.Form method="post" action={`/works/${workId}/${count}?index`}>
      <button type="submit" name="_action" value={action}>
        {action}
      </button>
    </fetcher.Form>
  );
};
