import { useFetcher } from "remix";
import * as EpisodeWatchOrUnwatchForm from "./EpisodeWatchOrUnwatchForm";

export type Props = {
  workId: number;
  count: number;
  watched: boolean;
};

export const Component: React.VFC<Props> = (props) => {
  const fetcher = useFetcher();
  return (
    <div className="episode-action-menu">
      <EpisodeWatchOrUnwatchForm.Component {...props} />
      <details>
        <summary>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 6C2 5.44772 2.44772 5 3 5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H3C2.44772 7 2 6.55228 2 6Z"
              fill="currentColor"
            />
            <path
              d="M2 12.0322C2 11.4799 2.44772 11.0322 3 11.0322H21C21.5523 11.0322 22 11.4799 22 12.0322C22 12.5845 21.5523 13.0322 21 13.0322H3C2.44772 13.0322 2 12.5845 2 12.0322Z"
              fill="currentColor"
            />
            <path
              d="M3 17.0645C2.44772 17.0645 2 17.5122 2 18.0645C2 18.6167 2.44772 19.0645 3 19.0645H21C21.5523 19.0645 22 18.6167 22 18.0645C22 17.5122 21.5523 17.0645 21 17.0645H3Z"
              fill="currentColor"
            />
          </svg>
        </summary>
        <ul>
          <li>
            <fetcher.Form
              method="post"
              action={`/works/${props.workId}/${props.count}?index`}
            >
              <label>
                rating
                <input
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
                <textarea name="comment"></textarea>
              </label>
              <button type="submit" name="_action" value="watch">
                watch with comment
              </button>
            </fetcher.Form>
          </li>
          <li>
            <fetcher.Form method="post" action={`/works/${props.workId}`}>
              <input type="hidden" name="upToCount" value={props.count} />
              <button type="submit" name="_action" value="watchUpTo">
                watch up to this episode
              </button>
            </fetcher.Form>
          </li>
        </ul>
      </details>
    </div>
  );
};
