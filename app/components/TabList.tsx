export type Props =
  | {
      type: "button";
      items: {
        id: string;
        tabText: string;
      }[];
      selectedTabId: string;
      onClick: (
        clickedTabId: string,
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
      ) => void;
    }
  | {
      type: "anchor";
      items: {
        id: string;
        tabText: string;
        href: string;
      }[];
      selectedTabId: string;
      onClick?: undefined;
    };

export const Component: React.FC<Props> = ({
  type,
  items,
  selectedTabId,
  onClick,
}) => {
  return (
    <ul className="flex gap-4 border-b border-outline">
      {type === "button"
        ? items.map((item) => {
            return (
              <li
                className={`${
                  selectedTabId === item.id &&
                  "text-link border-b-4 border-link"
                } pb-1`}
              >
                <button type="button" onClick={(e) => onClick(item.id, e)}>
                  {item.tabText}
                </button>
              </li>
            );
          })
        : items.map((item) => {
            return (
              <li
                className={`${
                  selectedTabId === item.id &&
                  "text-link border-b-4 border-link"
                } pb-1`}
              >
                <a href={item.href}>{item.tabText}</a>
              </li>
            );
          })}
    </ul>
  );
};