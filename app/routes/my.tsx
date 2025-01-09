import { Outlet, useMatches } from "@remix-run/react";

import urlFrom from "url-from";
import { bindUrl as bindUrlForMy } from "~/routes/my";

import { cour2symbol, date2cour } from "~/domain/cour/util";

import * as TabList from "~/components/TabList";

export const bindUrl = urlFrom`/my`.narrowing<{ "?query": { cour?: string } }>;

export default function Component() {
  const matches = useMatches();
  return (
    <div>
      <header className="flex gap-4">
        <h2>マイページ</h2>
      </header>
      <Outlet />
    </div>
  );
}
