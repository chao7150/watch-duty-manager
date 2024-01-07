import { Outlet, useLocation } from "@remix-run/react";
import * as TabList from "app/components/TabList";
import urlFrom from "url-from";

export const bindUrl = urlFrom`/my`.narrowing<{ "?query": { cour?: string } }>;

const Component: React.FC = () => {
  const location = useLocation();
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
            href: "/my",
          },
          {
            id: "tag",
            tabText: "パーソナルタグ",
            href: "/my/tag",
          },
        ]}
        selectedTabId={location.pathname.endsWith("/tag") ? "tag" : "dashboard"}
      />
      <Outlet />
    </div>
  );
};

export default Component;
