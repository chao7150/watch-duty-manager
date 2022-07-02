import { useFetcher } from "remix";

export type Props = {
  id: string;
  subscribing: boolean;
};

export const Component: React.VFC<Props> = ({ id, subscribing }) => {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post" action={`/works/${id}`}>
      {subscribing ? (
        <button name="_action" value="unsubscribe">
          unsubscribe
        </button>
      ) : (
        <button name="_action" value="subscribe">
          subscribe
        </button>
      )}
    </fetcher.Form>
  );
};
