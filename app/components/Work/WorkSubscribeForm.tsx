import { useFetcher } from "remix";

export type Props = {
  givenClassName?: string;
  id: string;
  subscribing: boolean;
};

export const Component: React.VFC<Props> = ({
  givenClassName,
  id,
  subscribing,
}) => {
  const fetcher = useFetcher();
  return (
    <fetcher.Form
      className={`work-subscribe-form ${givenClassName}`}
      method="post"
      action={`/works/${id}`}
    >
      {subscribing ? <UnsubscribeButton /> : <SubscribeButton />}
    </fetcher.Form>
  );
};

export const TextComponent: React.VFC<Props> = ({
  givenClassName,
  id,
  subscribing,
}) => {
  const fetcher = useFetcher();
  return (
    <fetcher.Form
      className={`work-subscribe-form ${givenClassName}`}
      method="post"
      action={`/works/${id}`}
    >
      {subscribing ? "視聴中" : "未視聴"}
    </fetcher.Form>
  );
};

const UnsubscribeButton = () => {
  return (
    <button className="" name="_action" value="unsubscribe" title="unsubscribe">
      見てる
    </button>
  );
};

const SubscribeButton = () => {
  return (
    <button className="" name="_action" value="subscribe" title="subscribe">
      見てない
    </button>
  );
};
