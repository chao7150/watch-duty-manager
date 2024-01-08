import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";

import urlFrom from "url-from";

import * as Tag from "~/components/Tag";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

export const bindUrl = urlFrom`/my/tag`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const tagsOnUserPromise = await db.tag.findMany({
    where: {
      userId,
    },
  });
  return {
    tagsOnUser: tagsOnUserPromise,
  };
};

export type ActionData = {
  successMessage?: string;
  errorMessage?: string;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  if (formData.get("_action") === "createPersonalTag") {
    const userId = await requireUserId(request);
    const text = formData.get("text");
    if (typeof text !== "string" || text === "") {
      return json(
        { errorMessage: "text must not be empty" } satisfies ActionData,
        { status: 400 }
      );
    }
    try {
      const res = await db.tag.create({
        data: {
          text,
          userId,
        },
      });
      return json({
        successMessage: `${res.text}の登録に成功しました`,
      } satisfies ActionData);
    } catch (e) {
      console.log(e);
      return json(
        { errorMessage: "不明なエラーが発生しました" } satisfies ActionData,
        { status: 500 }
      );
    }
  }
};

const Component: React.FC = () => {
  const { tagsOnUser } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();
  return (
    <main className="flex flex-col gap-4">
      <div>
        <div>
          <h3>登録済みのパーソナルタグ一覧</h3>
        </div>

        <ul className="flex gap-2">
          {tagsOnUser.map((t) => (
            <li key={t.id}>
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

export default Component;
