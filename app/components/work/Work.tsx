import type React from "react";
import { Link } from "react-router";
import * as WorkSubscribeForm from "~/components/work/WorkSubscribeForm";
import { bindUrl as bindUrlForWorks$WorkId } from "~/routes/works.$workId/route";

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
