import { useState, useCallback } from "react";

import * as FilterIcon from "~/components/Icons/Filter";

/**
 * 最低話数フィルターコンポーネント
 * 期間内に指定した話数以上放送される作品に限定するフィルターを提供します
 */
export const Component = ({
  initialMinEpisodes,
}: {
  /** 初期最低話数 */
  initialMinEpisodes: number;
}) => {
  const [minEpisodes, setMinEpisodes] = useState(initialMinEpisodes);

  // フィルター適用処理
  const applyEpisodesFilter = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("minEpisodes", minEpisodes.toString());
    location.href = url.toString();
  }, [minEpisodes]);

  return (
    <details className="relative">
      <summary className="list-none cursor-pointer p-1 hover:bg-gray-700 rounded">
        <FilterIcon.Component />
      </summary>
      <section className="z-10 absolute left-0 top-full mt-1 shadow-menu bg-dark p-2 rounded flex items-center gap-2 w-max">
        期間内に
        <input
          type="number"
          min="1"
          className="bg-accent-area w-8"
          value={minEpisodes}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (!isNaN(value)) {
              setMinEpisodes(value);
            }
          }}
        />
        話以上放送される作品に限定
        <button
          type="button"
          className="bg-accent-area px-2 py-1 rounded"
          onClick={applyEpisodesFilter}
        >
          適用
        </button>
      </section>
    </details>
  );
};
