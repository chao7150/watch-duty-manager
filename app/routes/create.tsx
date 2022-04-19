import { Work } from "@prisma/client";
import { ActionFunction, Form, json, useActionData } from "remix";
import { db } from "~/utils/db.server";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const title = formData.get("title");
  if (typeof title !== "string") {
    return json({ errorMessage: "title must not be empty" }, { status: 400 });
  }
  const optionalWorkCreateInput = [
    "officialSiteUrl",
    "twitterId",
    "hashtag",
  ].reduce((acc, key) => {
    const value = formData.get(key) ?? undefined;
    return { ...acc, [key]: value };
  }, {} as { officialSiteUrl?: string; twitterId?: string; hashtag?: string });
  try {
    const work = await db.work.create({
      data: { title, ...optionalWorkCreateInput },
    });
    return json(work, { status: 200 });
  } catch {
    return json({ errorMessage: "the title already exists" }, { status: 409 });
  }
};

export default function Create() {
  const actionData = useActionData<Work>();
  // TODO actionDataってステータスコード読めないの！？

  return (
    <>
      <p>
        {actionData ? `${actionData.title} was successfully submitted.` : ""}
      </p>
      <div>
        <Form method="post">
          <input type="text" name="title" />
          <input type="text" name="officialSiteUrl" />
          <input type="text" name="twitterId" />
          <input type="text" name="hashtag" />
          <button type="submit">submit</button>
        </Form>
      </div>
    </>
  );
}
