import { Work } from "@prisma/client";
import { DataFunctionArgs } from "@remix-run/server-runtime";
import { useLoaderData } from "remix";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

type LoaderData = { subscribedWorks: Work[] };
export const loader = async ({
  request,
}: DataFunctionArgs): Promise<LoaderData> => {
  const userId = await requireUserId(request);
  const subscribedWorks = await db.work.findMany({
    where: { users: { some: { userId } } },
  });
  return { subscribedWorks };
};

export default function My() {
  const { subscribedWorks } = useLoaderData<LoaderData>();

  return (
    <ul>
      {subscribedWorks.map((work) => (
        <li key={work.id}>{work.title}</li>
      ))}
    </ul>
  );
}
