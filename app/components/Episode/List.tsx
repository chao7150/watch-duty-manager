import { useState } from "react";
import * as Episode from "./Episode";

export type Props = {
  episodes: Episode.Props[];
};

export const Component: React.FC<Props> = ({ episodes }) => {
  const [filterKeyword, setFilterKeyword] = useState<string>("");
  return (
    <div>
      <ul className="flex flex-col gap-4 episode-list mt-4">
        {episodes.map((e) => {
          return (
            <li key={`${e.workId}-${e.count}`}>
              <Episode.Component {...e} />
            </li>
          );
        })}
      </ul>
    </div>
  );
};
