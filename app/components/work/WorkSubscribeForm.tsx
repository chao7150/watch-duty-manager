import { useState } from "react";
import { useFetcher } from "react-router";

import * as Button from "../Button";

export type Props = {
  givenClassName?: string;
  id: string;
  subscribing: boolean;
};

export const Component: React.FC<Props> = ({
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
  const [hovered, setHovered] = useState(false);
  return (
    <Button.Component
      className="w-24"
      name="_action"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="unsubscribe"
      value="unsubscribe"
    >
      {hovered ? "切る？" : "見てる"}
    </Button.Component>
  );
};

const SubscribeButton = () => {
  const [hovered, setHovered] = useState(false);
  return (
    <Button.Component
      className="w-24"
      name="_action"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="subscribe"
      value="subscribe"
    >
      {hovered ? "見る？" : "見てない"}
    </Button.Component>
  );
};
