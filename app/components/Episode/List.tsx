import { useState } from "react";
import * as Episode from "./Episode";

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
        <div>
          <div>フィルタ: {filterTitle}</div>
          <button onClick={() => setFilterWorkId(undefined)}>
            フィルタをクリア
          </button>
        </div>
      )}
      <ul className="flex flex-col gap-4 episode-list mt-4">
        {episodes
          .filter((e) => {
            if (filterWorkId === undefined) return true;
            return e.workId === filterWorkId;
          })
          .map((e) => {
            return (
              <li key={`${e.workId}-${e.count}`}>
                <Episode.Component
                  {...e}
                  onClickWatchUnready={
                    e.watchReady === false ? setFilterWorkId : undefined
                  }
                />
              </li>
            );
          })}
      </ul>
    </div>
  );
};
