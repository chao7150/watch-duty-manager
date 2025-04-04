import { LoaderFunctionArgs, data } from "@remix-run/node";

import * as E from "fp-ts/lib/Either.js";
import * as TE from "fp-ts/lib/TaskEither.js";
import * as F from "fp-ts/lib/function.js";

import { serverAction as WatchSettingsEditFormServerAction } from "~/components/watch-settings-edit-form/action.server";
import { serverAction as WorkEditFormServerAction } from "~/components/work-edit-form/action.server";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { extractParams } from "~/utils/type";

export const action = async ({ request, params }: LoaderFunctionArgs) => {
  const { workId: _workId } = extractParams(params, ["workId"]);
  const workId = parseInt(_workId, 10);

  const formData = await request.formData();
  if (formData.get("_action") === "delete") {
    const { count: _count } = extractParams(Object.fromEntries(formData), [
      "count",
    ]);
    const count = parseInt(_count, 10);
    await db.$transaction([
      db.episode.delete({
        where: { workId_count: { workId, count } },
      }),
      db.episode.updateMany({
        where: { workId, count: { gt: count } },
        data: { count: { decrement: 1 } },
      }),
    ]);
    return data({ message: "success", hasError: false }, { status: 200 });
  }
  if (formData.get("_action") === "addEpisodes") {
    const { episodeDate: _episodeDate, offset: _offset } = extractParams(
      Object.fromEntries(formData),
      ["episodeDate", "offset"],
    );
    const episodeDate = _episodeDate.split(",").map((d) => new Date(d));
    const offset = parseInt(_offset, 10);
    await db.episode.createMany({
      data: episodeDate.map((date, index) => ({
        count: offset + index,
        workId,
        publishedAt: date,
      })),
    });
    return data({ message: "success", hasError: false }, { status: 200 });
  }
  if (formData.get("_action") === "unsubscribe") {
    const userId = await requireUserId(request);
    await db.subscribedWorksOnUser.delete({
      where: { userId_workId: { userId, workId } },
    });
    return data({ message: "success", hasError: false }, { status: 200 });
  }
  if (formData.get("_action") === "subscribe") {
    const userId = await requireUserId(request);

    try {
      const rel = await db.subscribedWorksOnUser.create({
        data: {
          userId,
          workId,
        },
      });
      return data(
        { message: `${rel.userId} ${rel.workId} ok`, hasError: false },
        { status: 200 },
      );
    } catch (_) {
      return data({ message: "db error", hasError: true }, { status: 400 });
    }
  }
  if (formData.get("_action") === "watch-settings-edit") {
    const userId = await requireUserId(request);
    return await F.pipe(
      WatchSettingsEditFormServerAction(userId, workId, formData),
      TE.match(
        ({ errorMessage, status }) =>
          data({ message: errorMessage, hasError: true }, { status }),
        ({ successMessage, status }) =>
          data({ message: successMessage, hasError: false }, { status }),
      ),
    )();
  }
  // _action === "edit"
  return F.pipe(
    await WorkEditFormServerAction(workId, formData),
    E.match(
      ({ errorMessage, status }) =>
        data({ message: errorMessage, hasError: true }, { status }),
      ({ successMessage, status }) =>
        data({ message: successMessage, hasError: false }, { status }),
    ),
  );
};
