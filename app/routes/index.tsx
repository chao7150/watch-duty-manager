import { DataFunctionArgs } from "@remix-run/server-runtime";
import { MetaFunction, useFetcher } from "remix";
import { useLoaderData } from "remix";
import "firebase/compat/auth";
import { getUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import { Episode } from "@prisma/client";

type IndexData = {
  userId: string | null;
  tickets?: (Episode & { work: { title: string } })[];
};

export const loader = async ({
  request,
}: DataFunctionArgs): Promise<IndexData> => {
  const userId = await getUserId(request);
  if (userId === null) {
    return {
      userId,
    };
  }
  const tickets = await db.episode.findMany({
    where: {
      AND: [
        { work: { users: { some: { userId } } } },
        { WatchedEpisodesOnUser: { none: { userId } } },
        {
          publishedAt: {
            lte: new Date(new Date().getTime() + 1000 * 60 * 60 * 24),
          },
        },
      ],
    },
    include: { work: { select: { title: true } } },
  });
  return { userId, tickets };
};

// https://remix.run/api/conventions#meta
export const meta: MetaFunction = () => {
  return {
    title: "Watch duty manager",
    description: "Welcome to remix!",
  };
};

// https://remix.run/guides/routing#index-routes
export default function Index() {
  const { userId, tickets } = useLoaderData<IndexData>();
  const fetcher = useFetcher();

  return userId ? (
    <div className="remix__page">
      <ul>
        {tickets?.map((ticket) => {
          return (
            <ul key={`${ticket.workId}-${ticket.count}`}>
              <p>{ticket.work.title}</p>
              <p>#{ticket.count}</p>
              <fetcher.Form
                method="post"
                action={`/works/${ticket.workId}/${ticket.count}?index`}
              >
                <label>
                  コメント
                  <textarea name="comment"></textarea>
                </label>
                <button type="submit" name="_action" value="watch">
                  watch
                </button>
              </fetcher.Form>
            </ul>
          );
        })}
      </ul>
    </div>
  ) : (
    <div>not logged in</div>
  );
}
