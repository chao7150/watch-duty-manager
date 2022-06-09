import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { json, useActionData } from "remix";
import { db } from "~/utils/db.server";

import * as WorkCreateForm from "../components/WorkCreateForm";
import { DataFunctionArgs } from "@remix-run/server-runtime";

type ActionData = { title: string } | Response;

export const action = async ({
  request,
}: DataFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  return await pipe(
    formData,
    WorkCreateForm.serverValidator,
    TE.fromEither,
    TE.chain(({ episodeCount, ...work }) => {
      return TE.tryCatch(
        async () => ({
          returnedWork: await db.work.create({ data: work }),
          episodeCount,
        }),
        (e) => json({ errorMessage: "work already exists" }, { status: 409 })
      );
    }),
    TE.chain(({ returnedWork, episodeCount }) => {
      return TE.tryCatch(
        async () => {
          await db.episode.createMany({
            data: Array.from({ length: episodeCount }).map((_, index) => {
              return {
                workId: returnedWork.id,
                count: index + 1,
                publishedAt: new Date(
                  returnedWork.publishedAt.getTime() +
                    1000 * 60 * 60 * 24 * 7 * index
                ),
              };
            }),
          });
          return returnedWork;
        },
        (e) =>
          json({ errorMessage: "episode creation failed" }, { status: 500 })
      );
    }),
    TE.foldW(
      (e) => T.of(e),
      (v) => T.of({ ...v })
    )
  )();
};

export default function Create() {
  // HACK: 型付けろ
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
