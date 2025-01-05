import { json } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";

import { useState } from "react";

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import * as F from "fp-ts/function";

import * as WorkBulkCreateForm from "~/components/WorkBulkCreateForm";
import * as WorkCreateForm from "~/components/WorkCreateForm";

import { db } from "~/utils/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  if (formData.get("_action") === "bulkCreate") {
    return await F.pipe(
      TE.Do,
      TE.bind("formData", () => TE.right(formData)),

      TE.bind("insertingWorks", (ns) =>
        TE.fromEither(WorkBulkCreateForm.serverValidator(ns.formData))
      ),
      TE.bindW("insertResult", ({ insertingWorks }) =>
        TE.tryCatch(
          async () => {
            try {
              await db.work.createMany({
                data: insertingWorks.map(({ episodeCount, ...rest }) => rest),
              });
              return insertingWorks;
            } catch (e) {
              if (
                !(e instanceof PrismaClientKnownRequestError) ||
                e.code !== "P2002"
              ) {
                throw "unknownError";
              }
              try {
                const duplicatedWorkTitles = (
                  await db.work.findMany({
                    where: {
                      title: {
                        in: insertingWorks.map((work) => work.title),
                      },
                    },
                    select: { title: true },
                  })
                ).map((work) => work.title);
                return {
                  code: "uniqueConstraintFailed" as const,
                  duplicatedWorkTitles,
                };
              } catch (e) {
                throw "unknownError";
              }
            }
          },
          (e) => {
            return { code: "unknownError" as const };
          }
        )
      ),
      TE.bindW("_", ({ insertResult, insertingWorks }) => {
        if ("code" in insertResult) {
          return TE.left({
            code: "uniqueConstraintFailed" as const,
            duplicateWorkTitles: insertResult.duplicatedWorkTitles,
          });
        }
        return TE.right(insertingWorks);
      }),
      TE.bindW("insertedWorks", ({ insertingWorks }) =>
        TE.tryCatch(
          async () => {
            // mysqlではcreateManyAndReturnが使えないので今作ったWorkに振られたIDを知るためにselectする
            return await db.work.findMany({
              where: {
                title: {
                  in: insertingWorks.map((work) => work.title),
                },
              },
            });
          },
          () => ({ code: "worksObtainError" as const })
        )
      ),
      TE.bindW("createEpisodesResult", ({ insertingWorks, insertedWorks }) =>
        TE.tryCatch(
          async () => {
            return await db.episode.createMany({
              data: insertingWorks
                .map((work) => ({
                  ...work,
                  id: insertedWorks.find(
                    (insertedWork) => insertedWork.title === work.title
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
          () => ({ code: "episodeCreateError" as const })
        )
      ),
      TE.foldW(
        (e) => {
          switch (e.code) {
            case "uniqueConstraintFailed":
              return T.of(
                json(
                  {
                    errorMessage: `以下の作品はすでに登録されています: ${e.duplicateWorkTitles.join(
                      ", "
                    )}`,
                  },
                  { status: 409 }
                )
              );
            case "episodeCreateError":
              return T.of(
                json(
                  { errorMessage: "話数の登録に失敗しました" },
                  { status: 500 }
                )
              );
            case "empty":
              return T.of(
                json(
                  { errorMessage: "登録しようとしている作品が0件です" },
                  { status: 500 }
                )
              );
            case "unknownError":
            case "worksObtainError":
              return T.of(
                json(
                  { errorMessage: "不明なエラーが発生しました" },
                  { status: 500 }
                )
              );
          }
        },
        (v) =>
          T.of({
            action: "bulkCreate" as const,
            workCount: v.insertedWorks.length,
            episodeCount: v.createEpisodesResult.count,
          })
      )
    )();
  }
  return await F.pipe(
    formData,
    WorkCreateForm.serverValidator,
    TE.fromEither,
    TE.chain(({ episodeDate, ...work }) => {
      return TE.tryCatch(
        async () => ({
          returnedWork: await db.work.create({
            data: {
              ...work,
              publishedAt: episodeDate[0],
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
