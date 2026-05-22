import { useFetcher } from "react-router";

import { useState } from "react";

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
    <div
      className="w-24"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Button.Component name="_action" value="unsubscribe" title="unsubscribe">
        {hovered ? "切る？" : "見てる"}
      </Button.Component>
    </div>
  );
};

const SubscribeButton = () => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="w-24"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Button.Component name="_action" value="subscribe" title="subscribe">
        {hovered ? "見る？" : "見てない"}
      </Button.Component>
    </div>
  );
};
