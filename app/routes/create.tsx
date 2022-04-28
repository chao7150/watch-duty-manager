import { ActionFunction, Form, json, useActionData } from "remix";
import { db } from "~/utils/db.server";

import * as WorkCreateForm from "../components/WorkCreateForm";

const errorCode = {
  EMPTY_TITLE: "EmptyTitle",
  EMPTY_PUBLISHED_AT: "EmptyPublishedAt",
  WORK_ALREADY_EXISTS: "WorkAlreadyExists",
};

export const action: ActionFunction = async ({ request }) => {
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
  const publishedAt = formData.get("publishedAt");
  if (typeof publishedAt !== "string" || publishedAt === "") {
    return json(
      {
        errorCode: errorCode.EMPTY_PUBLISHED_AT,
        errorMessage: "publishedAt must not be empty",
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
    const work = await db.work.create({
      data: {
        title,
        publishedAt: new Date(publishedAt),
        ...optionalWorkCreateInput,
      },
    });
    return json(work, { status: 200 });
  } catch (e) {
    console.log(e);
    return json(
      {
        errorCode: errorCode.WORK_ALREADY_EXISTS,
        errorMessage: `${title} already exists`,
      },
      { status: 409 }
    );
  }
};

export default function Create() {
  const actionData = useActionData();

  return (
    <>
      <p>
        {actionData &&
          (actionData?.errorMessage ??
            `${actionData.title} was successfully submitted.`)}
      </p>
      <div>
        <WorkCreateForm.Component />
      </div>
    </>
  );
}
