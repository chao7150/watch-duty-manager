import { useFetcher } from "@remix-run/react";

import { useState } from "react";

import * as Button from "~/components/Button";

import * as EyeIcon from "../Icons/Eye";
import * as EyeOffIcon from "../Icons/EyeOff";
import * as SkipIcon from "../Icons/Skip";
import { useCloseDetailsOnClickAway } from "../hooks/useCloseDetailsOnClickAway";

export type Props = {
  workId: number;
  count: number;
  watched: boolean;
  skipped?: boolean;
};

export const Component: React.FC<Props> = ({
  workId,
  count,
  watched,
  skipped,
}) => {
  const fetcher = useFetcher();
  const [ratingEnabled, setRatingEnabled] = useState(true);
  const { ref, onToggle } = useCloseDetailsOnClickAway();

  return (
    <details ref={ref} onToggle={onToggle} className="relative">
      <summary className="cursor-pointer list-none">
        {watched ? (
          <EyeOffIcon.Component />
        ) : skipped ? (
          <SkipIcon.Component />
        ) : (
          <EyeIcon.Component />
        )}
      </summary>
      <div className="z-10 absolute left-10 -top-1 shadow-menu bg-dark p-2">
        {watched ? (
          <fetcher.Form
            method="POST"
            action={`/works/${workId}/${count}?index`}
            className="w-max"
          >
            <Button.Component type="submit" name="_action" value={"unwatch"}>
              {"unwatch"}
            </Button.Component>
          </fetcher.Form>
        ) : skipped ? (
          <fetcher.Form
            method="POST"
            action={`/works/${workId}/${count}?index`}
            className="w-max"
          >
            <Button.Component type="submit" name="_action" value={"unwatch"}>
              {"スキップ解除"}
            </Button.Component>
          </fetcher.Form>
        ) : (
          <fetcher.Form
            className="flex flex-col gap-2"
            method="POST"
            action={`/works/${workId}/${count}?index`}
          >
            <div className="flex justify-between">
              <label className="flex justify-between">
                <span className="hidden">rating enabled</span>
                <input
                  type="checkbox"
                  title="レーティングを登録する"
                  checked={ratingEnabled}
                  onChange={(e) => setRatingEnabled(e.target.checked)}
                />
              </label>
              <label>
                <span className="hidden">rating</span>
                <input
                  disabled={!ratingEnabled}
                  name="rating"
                  type="range"
                  min="0"
                  max="10"
                  list={`tickmarks-${workId}-${count}`}
                  defaultValue={5}
                />
                <datalist id={`tickmarks-${workId}-${count}`}>
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
            </div>
            <label>
              <span className="hidden">comment</span>
              <textarea className="resize" name="comment"></textarea>
            </label>
            <Button.Component type="submit" name="_action" value="watch">
              {fetcher.state === "idle" ? "視聴した" : "送信中"}
            </Button.Component>
            <Button.Component type="submit" name="_action" value="skip">
              スキップ
            </Button.Component>
          </fetcher.Form>
        )}
      </div>
    </details>
  );
};
