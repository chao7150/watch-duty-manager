import { Outlet, useMatches } from "@remix-run/react";

import urlFrom from "url-from";
import { bindUrl as bindUrlForMy } from "~/routes/my";

import { cour2symbol, date2cour } from "~/domain/cour/util";

import * as TabList from "~/components/TabList";

export const bindUrl = urlFrom`/my`.narrowing<{ "?query": { cour?: string } }>;

const Component: React.FC = () => {
  const matches = useMatches();
  return (
    <div>
      <header className="flex gap-4">
        <h2>マイページ</h2>
      </header>
      <TabList.Component
        type="anchor"
        items={[
          {
            id: "dashboard",
            tabText: "ダッシュボード",
            href: bindUrlForMy({
              "?query": { cour: cour2symbol(date2cour(new Date())) },
            }),
          },
          {
            id: "tag",
            tabText: "パーソナルタグ",
            href: "/my/tag",
          },
        ]}
        selectedTabId={
          matches.some((match) => match.pathname === "/my/tag")
            ? "tag"
            : "dashboard"
        }
      />
      <Outlet />
    </div>
  );
};

export default Component;
