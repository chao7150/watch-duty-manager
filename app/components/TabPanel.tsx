import { useState } from "react";

import * as TabList from "./TabList";

export type Props = {
  items: {
    id: string;
    tabText: string;
    content: React.ReactNode;
  }[];
};

export const Component: React.FC<Props> = ({ items }) => {
  const [tabId, setTabId] = useState(items[0].id);
  return (
    <div className="flex flex-col gap-4">
      <TabList.Component
        type="button"
        items={items.map((item) => ({
          id: item.id,
          tabText: item.tabText,
        }))}
        selectedTabId={tabId}
        onClick={(clickedTabId) => setTabId(clickedTabId)}
      />
      <div>{items.find((item) => item.id === tabId)?.content}</div>
    </div>
  );
};
