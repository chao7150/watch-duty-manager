import { data } from "react-router";

import { episodeRepository } from "~/adapters/repository/prisma/episode";
import { watchRepository } from "~/adapters/repository/prisma/watch";
import { workRepository } from "~/adapters/repository/prisma/work";
import { addEpisodes } from "~/usecases/addEpisodes";
import { deleteEpisode } from "~/usecases/deleteEpisode";
import { editWatchSettings } from "~/usecases/editWatchSettings";
import { editWork } from "~/usecases/editWork";
import { subscribeWork } from "~/usecases/subscribeWork";
import { unsubscribeWork } from "~/usecases/unsubscribeWork";
import { errorToMessage, errorToStatus } from "~/utils/result";
import { requireUserId } from "~/utils/session.server";
import { extractParams } from "~/utils/type";

import type { Route } from "../+types/route";

export const action = async ({ request, params }: Route.ActionArgs) => {
  const { workId: _workId } = extractParams(params, ["workId"]);
  const workId = parseInt(_workId, 10);
  const formData = await request.formData();
  const actionType = formData.get("_action");

  switch (actionType) {
    case "delete": {
      const { count: _count } = extractParams(Object.fromEntries(formData), [
        "count",
      ]);
      const count = parseInt(_count, 10);
      const result = await deleteEpisode({ episodeRepo: episodeRepository })(
        workId,
        count,
      );
      if (result.err) {
        return data(
          { message: errorToMessage(result.err), hasError: true },
          { status: errorToStatus(result.err) },
        );
      }
      return data(
        { message: result.ok.successMessage, hasError: false },
        { status: 200 },
      );
    }

    case "addEpisodes": {
      const { episodeDate: _episodeDate, offset: _offset } = extractParams(
        Object.fromEntries(formData),
        ["episodeDate", "offset"],
      );
      const episodeDate = _episodeDate.split(",").map((d) => new Date(d));
      const offset = parseInt(_offset, 10);
      const episodes = episodeDate.map((date, index) => ({
        workId,
        count: offset + index,
        publishedAt: date,
      }));
      const result = await addEpisodes({ episodeRepo: episodeRepository })(
        episodes,
      );
      if (result.err) {
        return data(
          { message: errorToMessage(result.err), hasError: true },
          { status: errorToStatus(result.err) },
        );
      }
      return data(
        { message: result.ok.successMessage, hasError: false },
        { status: 200 },
      );
    }

    case "unsubscribe": {
      const userId = await requireUserId(request);
      const result = await unsubscribeWork({ watchRepo: watchRepository })(
        userId,
        workId,
      );
      if (result.err) {
        return data(
          { message: errorToMessage(result.err), hasError: true },
          { status: errorToStatus(result.err) },
        );
      }
      return data(
        { message: result.ok.successMessage, hasError: false },
        { status: 200 },
      );
    }

    case "subscribe": {
      const userId = await requireUserId(request);
      const result = await subscribeWork({ watchRepo: watchRepository })(
        userId,
        workId,
      );
      if (result.err) {
        return data(
          { message: errorToMessage(result.err), hasError: true },
          { status: errorToStatus(result.err) },
        );
      }
      return data(
        { message: result.ok.successMessage, hasError: false },
        { status: 200 },
      );
    }

    case "watch-settings-edit": {
      const userId = await requireUserId(request);
      const result = await editWatchSettings({ watchRepo: watchRepository })(
        userId,
        workId,
        formData,
      );
      if (result.err) {
        return data(
          { message: errorToMessage(result.err), hasError: true },
          { status: errorToStatus(result.err) },
        );
      }
      return data(
        { message: result.ok.successMessage, hasError: false },
        { status: 200 },
      );
    }

    default: {
      // _action === "edit"
      const result = await editWork({ workRepo: workRepository })(
        workId,
        formData,
      );
      if (result.err) {
        return data(
          { message: errorToMessage(result.err), hasError: true },
          { status: errorToStatus(result.err) },
        );
      }
      return data(
        { message: result.ok.successMessage, hasError: false },
        { status: 200 },
      );
    }
  }
};
