import { useState } from "react";
import * as FilterIcon from "../Icons/Filter";
import * as Episode from "./Episode";

export type Props = {
  episodes: Episode.NewProps[];
};

export const Component: React.FC<Props> = ({ episodes }) => {
  const [filterKeyword, setFilterKeyword] = useState<string>("");
  return (
    <div>
      <input
        type="text"
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
              <div className="flex" title="タイトルで絞り込み">
                <button
                  className="flex"
                  onClick={() => {
                    if (filterKeyword === "") {
                      setFilterKeyword(e.title);
                    } else {
                      setFilterKeyword("");
                    }
                  }}
                >
                  <div>
                    {filterKeyword === "" ? (
                      <FilterIcon.Component />
                    ) : (
                      <FilterIcon.AltComponent />
                    )}
                  </div>
                </button>
                <Episode.Component.New {...e} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
