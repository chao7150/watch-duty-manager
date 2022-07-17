import React from "react";
import { Link } from "remix";

import * as WorkSubscribeForm from "../../components/Work/WorkSubscribeForm";

export type Props = {
  loggedIn: boolean;
  id: string;
  title: string;
  subscribed: boolean;
};

export const Component: React.VFC<Props> = ({
  loggedIn,
  id,
  title,
  subscribed,
}) => {
  return (
    <div className="work">
      {loggedIn && (
        <WorkSubscribeForm.Component givenClassName="work-work-subscribe-form" id={id} subscribing={subscribed} />
      )}
      <Link className="work-title" to={`/works/${id}`}>{title}</Link>
    </div>
  );
};
