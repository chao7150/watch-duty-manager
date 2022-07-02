import { Work, SubscribedWorksOnUser } from "@prisma/client";
import { DataFunctionArgs } from "@remix-run/server-runtime";
import { pipe } from "fp-ts/lib/function";
import { Link, useLoaderData } from "remix";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";
import * as WorkSubscribeForm from "../../components/Work/WorkSubscribeForm";

type LoaderData = {
  works: (Work & { users: SubscribedWorksOnUser[] })[];
  loggedIn: boolean;
};

export const loader = async ({
  request,
}: DataFunctionArgs): Promise<LoaderData> => {
  const result = await pipe((await getUserId(request)) ?? undefined, (userId) =>
    TE.tryCatch(
      async () => {
        const works = await db.work.findMany({
          include: { users: { where: { userId } } },
          orderBy: { id: "asc" },
        });
        return { works, loggedIn: userId !== undefined };
      },
      (e) => "db error"
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
    <ul>
      {works.map((work) => {
        return (
          <li key={work.id}>
            <div className="work-item-row">
              {loggedIn && (
                <WorkSubscribeForm.Component
                  id={work.id.toString()}
                  subscribing={work.users.length === 1}
                />
              )}
              <Link to={`/works/${work.id}`}>{work.title}</Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
