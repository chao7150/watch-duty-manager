import { Work } from "@prisma/client";
import { ActionFunction, Form, useActionData } from "remix";
import { db } from "~/utils/db.server";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const values = Object.fromEntries(formData);
  const result = await db.work.create({ data: values });
  return result;
};

export default function Create() {
  const actionData = useActionData<Work>();
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
