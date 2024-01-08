import { useFetcher } from "@remix-run/react";

import { useHover } from "react-use";

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
      method="POST"
      action={`/works/${id}`}
    >
      {subscribing ? <UnsubscribeButton /> : <SubscribeButton />}
    </fetcher.Form>
  );
};

const UnsubscribeButton = () => {
  const element = (hovered: boolean) => (
    <button
      className="w-24 bg-accent-area rounded-full py-1 px-3"
      name="_action"
      value="unsubscribe"
      title="unsubscribe"
    >
      {hovered ? "切る？" : "見てる"}
    </button>
  );
  const [hoverable] = useHover(element);
  return hoverable;
};

const SubscribeButton = () => {
  const element = (hovered: boolean) => (
    <button
      className="w-24 bg-accent-area rounded-full py-1 px-3"
      name="_action"
      value="subscribe"
      title="subscribe"
    >
      {hovered ? "見る？" : "見てない"}
    </button>
  );
  const [hoverable] = useHover(element);
  return hoverable;
};
