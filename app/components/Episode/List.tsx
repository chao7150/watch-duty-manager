import { useState } from "react";
import * as Episode from "./Episode";

export type Props = {
  episodes: Episode.NewProps[];
};

export const Component: React.FC<Props> = ({ episodes }) => {
  const [filterKeyword, setFilterKeyword] = useState<string>("");
  return (
    <div>
      <input
        value={filterKeyword}
        onChange={(e) => setFilterKeyword(e.target.value)}
        placeholder="タイトルで絞り込み"
      />
      <ul className="episode-list">
        {episodes.map((e) => {
          const hide = !e.title
            .toLowerCase()
            .includes(filterKeyword.toLowerCase());
          return (
            <li key={`${e.workId}-${e.count}`} aria-hidden={hide}>
              <Episode.Component.New {...e} />
            </li>
          );
        })}
      </ul>
    </div>
  );
};
