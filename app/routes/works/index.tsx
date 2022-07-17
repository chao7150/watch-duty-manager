import { Work as WorkModel, SubscribedWorksOnUser } from "@prisma/client";
import { type DataFunctionArgs } from "@remix-run/server-runtime";
import { pipe } from "fp-ts/lib/function";
import { Link, useLoaderData } from "remix";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";
import * as WorkUI from "~/components/Work/Work";

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
  const result = await pipe(
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
  const loaderData = useLoaderData<LoaderData>();
  const { works, loggedIn } = loaderData;
  return (
    <div>
      <h2>作品リスト</h2>
      <section>
        <ul>
          <li>
            <Link to="/works">全て</Link>
          </li>
          <li>
            <Link to="/works?releasedDateBegin=2022-07-01&releasedDateEnd=2022-10-01">
              2022夏
            </Link>
          </li>
          <li>
            <Link to="/works?releasedDateBegin=2022-04-01&releasedDateEnd=2022-07-01">
              2022春
            </Link>
          </li>
        </ul>
      </section>
      <section>
        <ul className="work-list">
          {works.map((work) => {
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
