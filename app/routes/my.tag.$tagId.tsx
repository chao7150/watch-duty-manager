import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import urlFrom from "url-from";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { extractParams } from "~/utils/type";

export const bindUrl = urlFrom`/my/tag/${"tagId:number"}`;

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const { tagId } = extractParams(params, ["tagId"]);
  const taggedWorks = await db.work.findMany({
    where: {
      users: {
        some: {
          userId,
          TagsOnSubscription: {
            some: {
              tagId: Number(tagId),
            },
          },
        },
      },
    },
  });
  return json({ taggedWorks });
};

const Component: React.FC = () => {
  const { taggedWorks } = useLoaderData<typeof loader>();
  return (
    <div>
      <ul>
        {taggedWorks.map((w) => {
          return <li key={w.id}>{w.title}</li>;
        })}
      </ul>
    </div>
  );
};

export default Component;
