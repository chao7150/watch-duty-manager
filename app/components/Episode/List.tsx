import { useMatches } from "@remix-run/react";

import { useEffect, useState } from "react";

import * as Button from "../Button";
import * as ArrowDownIcon from "../Icons/ArrowDown";
import * as ArrowUpIcon from "../Icons/ArrowUp";
import * as ClockIcon from "../Icons/Clock";
import * as CloseIcon from "../Icons/Close";
import * as Square2StackIcon from "../Icons/Square2Stack";
import * as Episode from "./Episode";

export type Props = {
  episodes: Omit<Episode.Props, "onClickWatchUnready">[];
  workIdDelayMinList: [number, number | null][];
  useLocalStorage?: boolean;
};

const useLocalStorageState = <T,>(
  name: string,
  defaultValue: T,
  useLocalStorage = true,
) => {
  const [initialized, setInitialized] = useState(false);
  const [state, setState] = useState<T>(defaultValue);
  const namespace = useMatches().at(-1)?.id;
  const key = `${namespace}_${name}`;

  useEffect(() => {
    if (useLocalStorage) {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        setState(JSON.parse(saved));
      }
    }
    setInitialized(true);
  }, [useLocalStorage]);

  useEffect(() => {
    if (initialized && useLocalStorage) {
      localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state, initialized, useLocalStorage]);

  return [state, setState] as const;
};

export const Component: React.FC<Props> = ({
  episodes,
  workIdDelayMinList,
  useLocalStorage = true,
}) => {
  const [sortDesc, setSortDesc] = useLocalStorageState<boolean>(
    "sortDesc",
    true,
    useLocalStorage,
  );
  const [stack, setStack] = useLocalStorageState<boolean>(
    "stack",
    false,
    useLocalStorage,
  );
  const [ignoreDelay, setIgnoreDelay] = useLocalStorageState<boolean>(
    "ignoreDelay",
    false,
    useLocalStorage,
  );
  const [filterWorkId, setFilterWorkId] = useState<number | undefined>(
    undefined,
  );

  const workIdDelayMinMap = new Map(workIdDelayMinList);

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
              onClick={() => setIgnoreDelay((s) => !s)}
              title={
                ignoreDelay
                  ? "視聴遅延設定を無視しています"
                  : "視聴遅延設定が有効です"
              }
            >
              {ignoreDelay ? (
                <ClockIcon.AltComponent />
              ) : (
                <ClockIcon.Component />
              )}
            </button>
          </li>
          {filterWorkId !== undefined && (
            <li>
              <Button.Component onClick={() => setFilterWorkId(undefined)}>
                <div className="flex gap-2">
                  <p>タイトル: {filterTitle}</p>
                  <CloseIcon.Component />
                </div>
              </Button.Component>
            </li>
          )}
        </ul>
      </div>

      <ul className={`flex mt-4 ${sortDesc ? "flex-col" : "flex-col-reverse"}`}>
        {episodes
          .map((e) => {
            if (ignoreDelay) {
              return { ...e, delayed: false };
            }
            const delay = workIdDelayMinMap.get(e.workId);
            if (!delay) {
              return { ...e, delayed: false };
            }
            return {
              ...e,
              publishedAt: new Date(
                new Date(e.publishedAt).getTime() + delay * 1000,
              ),
              delayed: true,
            };
          })
          .sort((a, b) => {
            return (
              new Date(b.publishedAt).getTime() -
              new Date(a.publishedAt).getTime()
            );
          })
          .map((e) => {
            const hidden =
              (filterWorkId !== undefined && e.workId !== filterWorkId) ||
              (stack && e.watchReady === false);

            return (
              <li
                key={`${e.workId}-${e.count}`}
                className={`rounded-lg pb-4 pt-1 px-1 hover:bg-accent-area ${hidden ? "hidden" : ""}`}
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
