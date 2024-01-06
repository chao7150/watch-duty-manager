import { useFetcher, useLoaderData } from "@remix-run/react";
import { ActionData, loader } from "./route";
import * as Tag from "../../components/Tag";

type Props = Pick<
  ReturnType<typeof useLoaderData<ReturnType<typeof loader>>>,
  "tagsOnUser"
>;

export const Component: React.FC<Props> = ({ tagsOnUser }) => {
  const fetcher = useFetcher<ActionData>();
  return (
    <main className="flex flex-col gap-4">
      <div>
        <div>
          <h3>登録済みのパーソナルタグ一覧</h3>
        </div>

        <ul className="flex gap-2">
          {tagsOnUser.map((t) => (
            <li>
              <Tag.Component text={t.text} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3>パーソナルタグを登録する</h3>
        <fetcher.Form method="POST">
          {fetcher.data?.errorMessage && <p>{fetcher.data.errorMessage}</p>}
          <div className="flex gap-2">
            <input type="text" name="text"></input>
            <button
              className="bg-accent-area rounded-full py-1 px-3"
              type="submit"
              name="_action"
              value="createPersonalTag"
            >
              送信
            </button>
          </div>
        </fetcher.Form>
      </div>
    </main>
  );
};
