import { useState } from "react";
import * as Episode from "./Episode";
import * as CloseIcon from "../Icons/Close";
import * as ArrowDownIcon from "../Icons/ArrowDown";
import * as ArrowUpIcon from "../Icons/ArrowUp";
import * as Square2StackIcon from "../Icons/Square2Stack";
import * as ClockIcon from "../Icons/Clock";

export type Props = {
  episodes: Omit<Episode.Props, "onClickWatchUnready">[];
};

export const Component: React.FC<Props> = ({ episodes }) => {
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const [stack, setStack] = useState<boolean>(false);
  const [shortOnly, setShortOnly] = useState<boolean>(false);
  const [filterWorkId, setFilterWorkId] = useState<number | undefined>(
    undefined
  );

  const filterTitle =
    episodes.find((e) => e.workId === filterWorkId)?.title ?? undefined;
  return (
    <div>
      <div className="controller">
        <ul className="h-8 flex flex-row items-center">
          <li>
            <button
              className="align-middle"
              onClick={() => setSortDesc((sort) => !sort)}
              title={sortDesc ? "降順" : "昇順"}
            >
              {sortDesc ? (
                <ArrowDownIcon.Component />
              ) : (
                <ArrowUpIcon.Component />
              )}
            </button>
          </li>
          <li>
            <button
              className="align-middle"
              onClick={() => setStack((stack) => !stack)}
              title={stack ? "同一作品をまとめて表示中" : "通常表示"}
            >
              {stack ? (
                <Square2StackIcon.AltComponent />
              ) : (
                <Square2StackIcon.Component />
              )}
            </button>
          </li>
          <li>
            <button
              className="align-middle"
              onClick={() => setShortOnly((shortOnly) => !shortOnly)}
              title={shortOnly ? "短編のみ表示中" : "通常表示"}
            >
              {shortOnly ? <ClockIcon.AltComponent /> : <ClockIcon.Component />}
            </button>
          </li>
          {filterWorkId !== undefined && (
            <li>
              <button
                className="bg-accent-area rounded-full py-1 px-3 flex gap-2"
                onClick={() => setFilterWorkId(undefined)}
              >
                <p>タイトル: {filterTitle}</p>
                <CloseIcon.Component />
              </button>
            </li>
          )}
        </ul>
      </div>

      <ul
        className={`flex mt-4 ${
          sortDesc ? "flex-col" : "flex-col-reverse"
        }`}
      >
        {episodes.map((e) => {
          const hidden =
            (filterWorkId !== undefined && e.workId !== filterWorkId) ||
            (stack && e.watchReady === false) ||
            (shortOnly && e.durationMin >= 30);
          return (
            <li
              key={`${e.workId}-${e.count}`}
              className={`pb-4 hover:bg-accent-area ${hidden ? "hidden" : ""}`}
            >
              <Episode.Component
                {...e}
                onClickWatchUnready={(workId: number) => {
                  setFilterWorkId((current) => {
                    if (current === undefined) {
                      return workId;
                    }
                    return undefined;
                  });
                }}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};
