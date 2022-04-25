import { Work } from "@prisma/client";
import { useCallback, useState } from "react";
import {
  ActionFunction,
  Form,
  json,
  LoaderFunction,
  useActionData,
  useLoaderData,
} from "remix";
import { db } from "~/utils/db.server";

export const loader: LoaderFunction = async ({ params }) => {
  const id = params.id;
  if (id === undefined) {
    // TODO エラー
    return null;
  }
  const work = await db.work.findUnique({ where: { id: parseInt(id, 10) } });
  return work;
};

const errorCode = {
  EMPTY_TITLE: "EmptyTitle",
  WORK_ALREADY_EXISTS: "WorkAlreadyExists",
};

export const action: ActionFunction = async ({ request, params }) => {
  const formData = await request.formData();
  const title = formData.get("title");
  if (typeof title !== "string" || title === "") {
    return json(
      {
        errorCode: errorCode.EMPTY_TITLE,
        errorMessage: "title must not be empty",
      },
      { status: 400 }
    );
  }
  const optionalWorkCreateInput = [
    "officialSiteUrl",
    "twitterId",
    "hashtag",
  ].reduce((acc, key) => {
    const formDataEntryValue = formData.get(key);
    const value =
      typeof formDataEntryValue === "string" ? formDataEntryValue : undefined;
    return { ...acc, [key]: value };
  }, {} as { officialSiteUrl?: string; twitterId?: string; hashtag?: string });
  try {
    const id = params.id;
    if (id === undefined) {
      // TODO エラー
      return null;
    }
    const work = await db.work.update({
      where: { id: parseInt(id, 10) },
      data: { title, ...optionalWorkCreateInput },
    });
    return json(work, { status: 200 });
  } catch {
    return json(
      {
        errorCode: errorCode.WORK_ALREADY_EXISTS,
        errorMessage: `${title} already exists`,
      },
      { status: 409 }
    );
  }
};

export default function Work() {
  const [editMode, setEditMode] = useState(false);
  const turnEditMode = useCallback(() => setEditMode((s) => !s), []);
  const work = useLoaderData<Work>();
  const hoge = useActionData();

  return (
    <div>
      <button onClick={turnEditMode}>
        {editMode ? "end edit" : "start edit"}
      </button>
      <h2>{work.title}</h2>
      {editMode ? (
        <Form method="post">
          <ul>
            <li>
              <label>
                title
                <abbr title="required" aria-label="required">
                  *
                </abbr>
                <input type="text" name="title" defaultValue={work.title} />
              </label>
            </li>
            <li>
              <label>
                officialSiteUrl
                <input
                  type="text"
                  name="officialSiteUrl"
                  defaultValue={work.officialSiteUrl ?? ""}
                />
              </label>
            </li>
            <li>
              <label>
                twitterId
                <input
                  type="text"
                  name="twitterId"
                  defaultValue={work.twitterId ?? ""}
                />
              </label>
            </li>
            <li>
              <label>
                hashtag
                <input
                  type="text"
                  name="hashtag"
                  defaultValue={work.hashtag ?? ""}
                />
              </label>
            </li>
            <li>
              <button type="submit">submit</button>
            </li>
          </ul>
        </Form>
      ) : (
        <dl>
          <dt>公式サイト</dt>
          <dd>
            <a href={work.officialSiteUrl ?? undefined}>
              {work.officialSiteUrl}
            </a>
          </dd>
          <dt>公式ツイッター</dt>
          <dd>
            <a href={`https://twitter.com/${work.twitterId}`}>
              {work.twitterId}
            </a>
          </dd>
          <dt>ハッシュタグ</dt>
          <dd>#{work.hashtag}</dd>
        </dl>
      )}
    </div>
  );
}
