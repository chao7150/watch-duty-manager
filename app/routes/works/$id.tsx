import { Work } from "@prisma/client";
import { useCallback, useState } from "react";
import {
  ActionFunction,
  json,
  LoaderFunction,
  useActionData,
  useLoaderData,
} from "remix";
import { db } from "~/utils/db.server";

import * as WorkCreateForm from "../../components/WorkCreateForm";

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

type ClientWork = Omit<Work, "publishedAt"> & { publishedAt: string };

export default function Work() {
  const [editMode, setEditMode] = useState(false);
  const turnEditMode = useCallback(() => setEditMode((s) => !s), []);
  const work = useLoaderData<ClientWork>();
  const defaultValueMap: WorkCreateForm.Props = {
    title: { defaultValue: work.title ?? "" },
    publishedAt: {
      defaultValue: work.publishedAt.slice(0, 7),
    },
    officialSiteUrl: { defaultValue: work.officialSiteUrl ?? "" },
    twitterId: { defaultValue: work.twitterId ?? "" },
    hashTag: { defaultValue: work.hashtag ?? "" },
  };
  const hoge = useActionData();

  return (
    <div>
      <button onClick={turnEditMode}>
        {editMode ? "end edit" : "start edit"}
      </button>
      <h2>{work.title}</h2>
      {editMode ? (
        <WorkCreateForm.Component {...defaultValueMap} />
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
