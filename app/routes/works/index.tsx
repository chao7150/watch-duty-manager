import { Work, SubscribedWorksOnUser } from "@prisma/client";
import { DataFunctionArgs } from "@remix-run/server-runtime";
import { Form, Link, useFetcher, useLoaderData } from "remix";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";

type LoaderData = {
  works: (Work & { users: SubscribedWorksOnUser[] })[];
  loggedIn: boolean;
};

export const loader = async ({
  request,
}: DataFunctionArgs): Promise<LoaderData> => {
  const userId = (await getUserId(request)) ?? undefined;
  const works = await db.work.findMany({
    include: { users: { where: { userId } } },
    orderBy: { id: "asc" },
  });
  return { works, loggedIn: userId !== undefined };
};

export default function Works() {
  const { works, loggedIn } = useLoaderData<LoaderData>();
  const fetcher = useFetcher();
  return (
    <ul>
      {works.map((work) => {
        return (
          <li key={work.id}>
            <div className="work-item-row">
              {loggedIn && (
                <fetcher.Form method="post" action={`/works/${work.id}`}>
                  {work.users.length === 1 ? (
                    <button name="_action" value="unsubscribe">
                      unsubscribe
                    </button>
                  ) : (
                    <button name="_action" value="subscribe">
                      subscribe
                    </button>
                  )}
                </fetcher.Form>
              )}
              <Link to={`/works/${work.id}`}>{work.title}</Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
