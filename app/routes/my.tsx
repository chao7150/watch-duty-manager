import { Outlet } from "@remix-run/react";

import urlFrom from "url-from";

export const bindUrl = urlFrom`/my`.narrowing<{ "?query": { cour?: string } }>;

export default function Component() {
  return (
    <div>
      <header className="flex gap-4">
        <h2>マイページ</h2>
      </header>
      <Outlet />
    </div>
  );
}
