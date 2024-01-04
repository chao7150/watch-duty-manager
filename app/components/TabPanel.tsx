import { useState } from "react";

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
      <ul className="flex gap-4 border-b border-outline">
        {items.map((item) => {
          return (
            <li
              className={`${
                tabId === item.id && "text-link border-b-4 border-link"
              } pb-1`}
            >
              <button type="button" onClick={() => setTabId(item.id)}>
                {item.tabText}
              </button>
            </li>
          );
        })}
      </ul>
      <div>{items.find((item) => item.id === tabId)?.content}</div>
    </div>
  );
};
