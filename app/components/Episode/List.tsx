import { useState } from "react";
import * as Episode from "./Episode";

export type Props = {
  episodes: Episode.Props[];
};

export const Component: React.FC<Props> = ({ episodes }) => {
  const [filterKeyword, setFilterKeyword] = useState<string>("");
  return (
    <div>
      <input
        type="search"
        value={filterKeyword}
        onChange={(e) => setFilterKeyword(e.target.value)}
        placeholder="タイトルで絞り込み"
      />
      <ul className="flex flex-col gap-4 episode-list mt-4">
        {episodes.map((e) => {
          const hide = !e.title
            .toLowerCase()
            .includes(filterKeyword.toLowerCase());
          return (
            <li
              className={hide ? "hidden" : ""}
              key={`${e.workId}-${e.count}`}
              aria-hidden={hide}
            >
              <Episode.Component {...e} />
            </li>
          );
        })}
      </ul>
    </div>
  );
};
