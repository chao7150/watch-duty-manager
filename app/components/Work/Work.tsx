import { Link } from "@remix-run/react";

import React from "react";

import { bindUrl as bindUrlForWorks$WorkId } from "~/routes/works.$workId";

import * as WorkSubscribeForm from "~/components/Work/WorkSubscribeForm";

export type Props = {
  loggedIn: boolean;
  id: number;
  title: string;
  subscribed: boolean;
};

export const Component: React.FC<Props> = ({
  loggedIn,
  id,
  title,
  subscribed,
}) => {
  return (
    <div className="flex flex-row items-center gap-1">
      {loggedIn && (
        <WorkSubscribeForm.Component
          givenClassName="work-work-subscribe-form"
          id={`${id}`}
          subscribing={subscribed}
        />
      )}
      <Link to={bindUrlForWorks$WorkId({ workId: id })}>{title}</Link>
    </div>
  );
};
