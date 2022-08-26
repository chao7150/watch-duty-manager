import { Work as WorkModel, SubscribedWorksOnUser } from "@prisma/client";
import { type DataFunctionArgs } from "@remix-run/server-runtime";
import * as F from "fp-ts/function";
import { useLoaderData } from "remix";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import { useState } from "react";
import { isSameQuarter } from "date-fns";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";
import * as WorkUI from "~/components/Work/Work";
import { interval2CourList } from "~/utils/date";
import { Serialized } from "~/utils/type";

type LoaderData = {
  works: (WorkModel & { users: SubscribedWorksOnUser[] })[];
  loggedIn: boolean;
};

export const loader = async ({
  request,
}: DataFunctionArgs): Promise<LoaderData> => {
  const url = new URL(request.url);
  const releasedDateBegin = url.searchParams.get("releasedDateBegin");
  const releasedDateEnd = url.searchParams.get("releasedDateEnd");
  const result = await F.pipe(
    (await getUserId(request)) ?? undefined,
    (userId) =>
      TE.tryCatch(
        async () => {
          const works = await db.work.findMany({
            include: {
              users: { where: { userId } },
              episodes: { where: { count: 1 } },
            },
            orderBy: { id: "asc" },
          });
          return { works, loggedIn: userId !== undefined };
        },
        () => "db error"
      ),
    TE.chain((v) =>
      TE.of({
        ...v,
        works: v.works.filter((work) => {
          const firstEpisode = work.episodes[0];
          if (firstEpisode === undefined) {
            return false;
          }
          const publishedAt = firstEpisode.publishedAt;
          const beginConditionFullfilled =
            releasedDateBegin === null ||
            new Date(
              new Date(releasedDateBegin).getTime() - 1000 * 60 * 60 * 9
            ) < publishedAt;
          const endConditionFullfilled =
            releasedDateEnd === null ||
            publishedAt <
              new Date(
                new Date(releasedDateEnd).getTime() - 1000 * 60 * 60 * 9
              );
          return beginConditionFullfilled && endConditionFullfilled;
        }),
      })
    )
  )();
  if (E.isLeft(result)) {
    throw new Error(result.left);
  }
  return result.right;
};

export default function Works() {
  const loaderData = useLoaderData<Serialized<LoaderData>>();
  const [filterCondition, setFilterCondition] = useState<
    { label: string; start: Date } | undefined
  >(undefined);
  const { works, loggedIn } = loaderData;
  const oldest = Math.min(
    ...works.map((w) => new Date(w.publishedAt).getTime())
  );
  const courList = interval2CourList(new Date(oldest), new Date());
  const shownWorks = works.filter((w) => {
    if (filterCondition === undefined) {
      return true;
    }
    return isSameQuarter(new Date(w.publishedAt), filterCondition.start);
  });
  return (
    <div>
      <h2>作品リスト</h2>
      <section>
        <h3>絞り込み</h3>
        <button onClick={() => setFilterCondition(undefined)}>
          絞り込み解除
        </button>
        <ul className="works-filter-condition-list">
          {courList.map(([label, start]) => {
            return (
              <li className="works-filter-condition-item" key={label}>
                <button onClick={() => setFilterCondition({ label, start })}>
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h3>
          <span>
            {filterCondition === undefined ? "全て" : filterCondition.label}
          </span>
          のアニメ(<span>{shownWorks.length}</span>)
        </h3>
        <ul className="work-list">
          {shownWorks.map((work) => {
            return (
              <li key={work.id}>
                <WorkUI.Component
                  loggedIn={loggedIn}
                  id={work.id.toString()}
                  title={work.title}
                  subscribed={work.users.length === 1}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
