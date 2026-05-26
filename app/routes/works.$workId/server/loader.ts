import { watchRepository } from "~/adapters/repository/prisma/watch";
import { workRepository } from "~/adapters/repository/prisma/work";
import { getWorkDetail } from "~/usecases/getWorkDetail";
import { getUserId } from "~/utils/session.server";
import { extractParams } from "~/utils/type";

import type { Route } from "../+types/route";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const userId = (await getUserId(request)) ?? undefined;
  const { workId } = extractParams(params, ["workId"]);

  const result = await getWorkDetail({
    workRepo: workRepository,
    watchRepo: watchRepository,
  })({
    workId: parseInt(workId, 10),
    userId,
  });

  return result;
};

export type LoaderData = Awaited<ReturnType<typeof loader>>;
