import { Link, useLoaderData, useMatches } from "@remix-run/react";

import urlFrom from "url-from";

import * as EpisodeScheduleSection from "./components/episode-schedule-section";
import * as RatingChartSection from "./components/rating-chart-section";
import * as WatchSettingsSection from "./components/watch-settings-section";
import * as WorkInfoSection from "./components/work-info-section";
import * as WorkSubscribeForm from "~/components/work/WorkSubscribeForm";

import { loader } from "./server/loader";

export { action } from "./server/action";

export { loader };

export const bindUrl = urlFrom`/works/${"workId:number"}`;

// 現在表示中のoutletの話数countを取得するカスタムフック
const useCount = () => {
  const countMatch = useMatches().find(
    (m) => m.id === "routes/works.$workId.$count",
  );
  return countMatch && Number(countMatch.params.count);
};

export default function Component() {
  const { loggedIn, work, subscribed, rating, ratings, delay, url } =
    useLoaderData<typeof loader>();

  const outletId = useCount();

  return (
    <div>
      <div className="flex">
        <h2 className="flex items-center">
          <Link to={bindUrl({ workId: work.id })}>{work.title}</Link>
        </h2>
        {loggedIn && (
          <>
            <div className="ml-4">
              <WorkSubscribeForm.Component
                id={work.id.toString()}
                subscribing={subscribed}
              />
            </div>
            <div className="ml-4 flex items-center">
              <div>{rating.toFixed(1)}</div>
            </div>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-8 pt-8">
        <div className="flex flex-col justify-between gap-4">
          <div className="grid grid-cols-2 gap-4">
            <WorkInfoSection.Component work={work} />
            {subscribed && (
              <WatchSettingsSection.Component
                workId={work.id}
                delay={delay}
                url={url}
              />
            )}
          </div>
          <RatingChartSection.Component ratings={ratings} />
        </div>
        <EpisodeScheduleSection.Component
          work={{ ...work, loggedIn }}
          outletId={outletId}
        />
      </div>
    </div>
  );
}
