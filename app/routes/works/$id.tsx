import { Prisma, Work } from "@prisma/client";
import { useCallback, useState } from "react";
import {
  ActionFunction,
  Form,
  json,
  LoaderFunction,
  redirect,
  useActionData,
  useLoaderData,
} from "remix";
import { db } from "~/utils/db.server";

import * as WorkCreateForm from "../../components/WorkCreateForm";
import { getSession } from "~/session";

export const loader: LoaderFunction = async ({ request, params }) => {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("uid")) {
    return redirect("/");
  }
  const userId = session.get("uid");
  if (typeof userId !== "string") {
    return redirect("/");
  }
  const id = params.id;
  if (id === undefined) {
    // TODO エラー
    return null;
  }
  const work = await db.work.findUnique({
    where: { id: parseInt(id, 10) },
    include: { users: { where: { userId } } },
  });
  return { ...work, userd: undefined, subscribed: work?.users.length === 1 };
};

export const action: ActionFunction = async ({ request, params }) => {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("uid")) {
    return redirect("/");
  }
  const userId = session.get("uid");
  if (typeof userId !== "string") {
    return redirect("/");
  }
  const workId = params.id;
  if (typeof workId !== "string") {
    return;
  }

  const formData = await request.formData();
  if (formData.get("_action") === "unsubscribe") {
    await db.subscribedWorksOnUser.delete({
      where: { userId_workId: { userId, workId: parseInt(workId, 10) } },
    });
    return json({}, { status: 200 });
  }
  if (formData.get("_action") === "subscribe") {
    try {
      const rel = await db.subscribedWorksOnUser.create({
        data: {
          userId,
          workId: parseInt(workId, 10),
        },
      });
      return json(rel, { status: 200 });
    } catch (e) {
      return json({ errorMessage: "db error" }, { status: 400 });
    }
  }
  let work: Prisma.WorkCreateInput;
  try {
    work = WorkCreateForm.serverValidator(formData);
  } catch (errorMessage) {
    return json({ errorMessage }, { status: 400 });
  }

  const id = params.id;
  if (id === undefined) {
    // TODO エラー
    return null;
  }

  try {
    const returnedWork = await db.work.update({
      where: { id: parseInt(id, 10) },
      data: work,
    });
    return json(returnedWork, { status: 200 });
  } catch {
    return json(
      {
        errorMessage: `work already exists`,
      },
      { status: 409 }
    );
  }
};

type ClientWork = Omit<Work, "publishedAt"> & {
  publishedAt: string;
  subscribed: boolean;
};

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
        <>
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
          <Form method="post">
            {work.subscribed ? (
              <button name="_action" value="unsubscribe">
                unsubscribe
              </button>
            ) : (
              <button name="_action" value="subscribe">
                subscribe
              </button>
            )}
          </Form>
        </>
      )}
    </div>
  );
}
