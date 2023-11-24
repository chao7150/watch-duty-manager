import { useState } from "react";
import * as Episode from "./Episode";
import * as CloseIcon from "../Icons/Close";

export type Props = {
  episodes: Episode.Props[];
};

export const Component: React.FC<Props> = ({ episodes }) => {
  const [filterWorkId, setFilterWorkId] = useState<number | undefined>(
    undefined
  );
  const filterTitle =
    episodes.find((e) => e.workId === filterWorkId)?.title ?? undefined;
  return (
    <div>
      {filterWorkId !== undefined && (
        <button
          className="bg-accent-area rounded-full py-1 px-3 flex gap-2"
          onClick={() => setFilterWorkId(undefined)}
        >
          <p>タイトル: {filterTitle}</p>
          <CloseIcon.Component />
        </button>
      )}
      <ul className="flex flex-col episode-list mt-4">
        {episodes.map((e) => {
          const hidden =
            filterWorkId !== undefined && e.workId !== filterWorkId;
          return (
            <li
              key={`${e.workId}-${e.count}`}
              className={`pb-4 hover:bg-accent-area ${hidden ? "hidden" : ""}`}
            >
              <Episode.Component {...e} onClickWatchUnready={setFilterWorkId} />
            </li>
          );
        })}
      </ul>
    </div>
  );
};
