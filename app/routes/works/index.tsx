import { Work } from "@prisma/client";
import { Link, LoaderFunction, useLoaderData } from "remix";
import { db } from "~/utils/db.server";

export const loader: LoaderFunction = async () => {
  const works = await db.work.findMany({
    select: { id: true, title: true },
    orderBy: { id: "asc" },
  });
  return works;
};

export default function Works() {
  const works = useLoaderData<Work[]>();
  return (
    <ul>
      {works.map((work) => {
        return (
          <li key={work.id}>
            <Link to={`/works/${work.id}`}>{work.title}</Link>
          </li>
        );
      })}
    </ul>
  );
}
