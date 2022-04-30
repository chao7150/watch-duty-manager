import { Prisma } from "@prisma/client";
import { ActionFunction, json, useActionData } from "remix";
import { db } from "~/utils/db.server";

import * as WorkCreateForm from "../components/WorkCreateForm";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  let work: Prisma.WorkCreateInput;
  try {
    work = WorkCreateForm.serverValidator(formData);
  } catch (errorMessage) {
    return json({ errorMessage }, { status: 400 });
  }
  try {
    const returnedWork = await db.work.create({
      data: work,
    });
    return json(returnedWork, { status: 200 });
  } catch (e) {
    return json(
      {
        errorMessage: `work already exists`,
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
