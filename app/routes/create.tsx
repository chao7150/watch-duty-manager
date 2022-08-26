import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import * as F from "fp-ts/function";
import { json, useActionData } from "remix";
import { db } from "~/utils/db.server";

import * as WorkCreateForm from "../components/WorkCreateForm";
import * as WorkBulkCreateForm from "../components/WorkBulkCreateForm";
import { type DataFunctionArgs } from "@remix-run/server-runtime";

type ActionData =
  | { title: string }
  | Response
  | { action: "bulkCreate"; count: number };

export const action = async ({
  request,
}: DataFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  if (formData.get("_action") === "bulkCreate") {
    return await F.pipe(
      formData,
      WorkBulkCreateForm.serverValidator,
      TE.fromEither,
      TE.chain((works) => {
        return TE.tryCatch(
          async () => {
            await db.work.createMany({
              data: works.map(({ episodeCount, ...rest }) => rest),
            });
            return works;
          },
          (e) => {
            return json(
              { errorMessage: "works create error" },
              { status: 500 }
            );
          }
        );
      }),
      TE.chain((works) => {
        return TE.tryCatch(
          async () => {
            return {
              works,
              returnedWorks: await db.work.findMany({
                where: { title: { in: works.map((work) => work.title) } },
              }),
            };
          },
          () => json({ errorMessage: "works obtain error" }, { status: 500 })
        );
      }),
      TE.chain(({ works, returnedWorks }) => {
        return TE.tryCatch(
          async () => {
            return await db.episode.createMany({
              data: works
                .map((work) => ({
                  ...work,
                  id: returnedWorks.find(
                    (returnedWork) => returnedWork.title === work.title
                  )!.id,
                }))
                .flatMap((combinedWork) =>
                  Array.from({ length: combinedWork.episodeCount }).map(
                    (_, index) => {
                      return {
                        workId: combinedWork.id,
                        count: index + 1,
                        publishedAt: new Date(
                          combinedWork.publishedAt.getTime() +
                            1000 * 60 * 60 * 24 * 7 * index
                        ),
                      };
                    }
                  )
                ),
            });
          },
          () => json({ errorMessage: "episode create error" }, { status: 500 })
        );
      }),
      TE.foldW(
        (e) => T.of(e),
        (v) => T.of({ action: "bulkCreate" as const, count: v.count })
      )
    )();
  }
  return await F.pipe(
    formData,
    WorkCreateForm.serverValidator,
    TE.fromEither,
    TE.chain(({ episodeCount, ...work }) => {
      return TE.tryCatch(
        async () => ({
          returnedWork: await db.work.create({ data: work }),
          episodeCount,
        }),
        () => json({ errorMessage: "work already exists" }, { status: 409 })
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
        () =>
          json({ errorMessage: "episode creation failed" }, { status: 500 })
      );
    }),
    TE.foldW(
      (e) => T.of(e),
      (v) => T.of(v)
    )
  )();
};

export default function Create() {
  // HACK: 型付けろ
  const actionData = useActionData<ActionData>();

  return (
    <>
      <p>
        {actionData &&
          (actionData?.errorMessage ??
            `${actionData.title} was successfully submitted.`)}
      </p>
      <div>
        <WorkBulkCreateForm.Component />
        <WorkCreateForm.Component />
      </div>
    </>
  );
}
