import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import * as F from "fp-ts/function";
import { json } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { useState } from "react";
import { ActionArgs, redirect } from "@remix-run/server-runtime";
import * as WorkCreateForm from "../components/WorkCreateForm";
import * as WorkBulkCreateForm from "../components/WorkBulkCreateForm";
import { db } from "~/utils/db.server";

export const action = async ({ request }: ActionArgs) => {
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
    TE.chain(({ episodeDate, distributions, ...work }) => {
      return TE.tryCatch(
        async () => ({
          returnedWork: await db.work.create({
            data: {
              ...work,
              publishedAt: episodeDate[0],
              DistributorsOnWorks: {
                createMany: { data: distributions ?? [] },
              },
            },
          }),
          episodeDate,
        }),
        (e) => json({ errorMessage: e as string }, { status: 409 })
      );
    }),
    TE.chain(({ returnedWork, episodeDate }) => {
      return TE.tryCatch(
        async () => {
          await db.episode.createMany({
            data: episodeDate.map((date, index) => {
              return {
                workId: returnedWork.id,
                count: index + 1,
                publishedAt: date,
              };
            }),
          });
          return returnedWork;
        },
        () => json({ errorMessage: "episode creation failed" }, { status: 500 })
      );
    }),
    TE.foldW(
      (e) => T.of(e),
      (v) => T.of(redirect(`/works/${v.id}`))
    )
  )();
};

export default function Create() {
  const [bulkCreateMode, setBulkCreateMode] = useState(false);
  // HACK: 型付けろ
  const actionData = useActionData<typeof action>();

  return (
    <div className="pb-8">
      <h2>作品登録</h2>
      <section className="mt-4">
        <p>{actionData && JSON.stringify(actionData)}</p>
        <div>
          <button onClick={() => setBulkCreateMode((m) => !m)}>
            {bulkCreateMode ? "戻る" : "複数入力する"}
          </button>
          {bulkCreateMode ? (
            <WorkBulkCreateForm.Component />
          ) : (
            <WorkCreateForm.Component />
          )}
        </div>
      </section>
    </div>
  );
}
