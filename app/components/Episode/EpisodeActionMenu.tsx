import { useFetcher } from "@remix-run/react";
import { useState } from "react";
import * as EyeOffIcon from "../Icons/EyeOff";
import * as EyeIcon from "../Icons/Eye";

export type Props = {
  workId: number;
  count: number;
  watched: boolean;
};

export const Component: React.VFC<Props> = ({ workId, count, watched }) => {
  const fetcher = useFetcher();
  const [ratingEnabled, setRatingEnabled] = useState(true);
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none">
        {watched ? <EyeOffIcon.Component /> : <EyeIcon.Component />}
      </summary>
      <div className="z-10 absolute left-10 -top-1 shadow-menu bg-dark p-2">
        {watched ? (
          <fetcher.Form
            method="post"
            action={`/works/${workId}/${count}?index`}
          >
            <button
              className="bg-accent-area rounded-full py-1 px-3"
              type="submit"
              name="_action"
              value={"unwatch"}
            >
              {"unwatch"}
            </button>
          </fetcher.Form>
        ) : (
          <fetcher.Form
            className="flex flex-col"
            method="post"
            action={`/works/${workId}/${count}?index`}
          >
            <label className="flex justify-between">
              <div className="hidden">rating</div>
              <input
                type="checkbox"
                title="レーティングを登録する"
                checked={ratingEnabled}
                onChange={(e) => setRatingEnabled(e.target.checked)}
              />
              <input
                disabled={!ratingEnabled}
                name="rating"
                type="range"
                min="0"
                max="10"
                list="tickmarks"
                defaultValue={5}
              />
              <datalist id="tickmarks">
                <option value="0"></option>
                <option value="1"></option>
                <option value="2"></option>
                <option value="3"></option>
                <option value="4"></option>
                <option value="5"></option>
                <option value="6"></option>
                <option value="7"></option>
                <option value="8"></option>
                <option value="9"></option>
                <option value="10"></option>
              </datalist>
            </label>
            <label>
              <div className="hidden">comment</div>
              <textarea name="comment"></textarea>
            </label>
            <button
              className="bg-accent-area rounded-full py-1 px-3"
              type="submit"
              name="_action"
              value="watch"
            >
              watch with comment
            </button>
          </fetcher.Form>
        )}
      </div>
    </details>
  );
};
