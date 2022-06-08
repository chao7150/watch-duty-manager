import { Prisma } from "@prisma/client";
import { isLeft } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { ActionFunction, json, useActionData } from "remix";
import { db } from "~/utils/db.server";

import * as WorkCreateForm from "../components/WorkCreateForm";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const e = pipe(formData, WorkCreateForm.serverValidator);
  if (isLeft(e)) {
    return e.left;
  }
  const { episodeCount, ...work } = e.right;
  try {
    const returnedWork = await db.work.create({
      data: work,
    });
    const data = Array.from({ length: episodeCount }).map((_, index) => {
      return {
        workId: returnedWork.id,
        count: index + 1,
        publishedAt: new Date(
          returnedWork.publishedAt.getTime() + 1000 * 60 * 60 * 24 * 7 * index
        ),
      };
    });
    await db.episode.createMany({
      data,
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
