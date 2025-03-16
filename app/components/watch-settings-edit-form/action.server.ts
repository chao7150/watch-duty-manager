import * as TE from "fp-ts/lib/TaskEither.js";
import * as F from "fp-ts/lib/function.js";

import { db } from "~/utils/db.server";

export const serverAction = (
  userId: string,
  workId: number,
  formData: FormData,
): TE.TaskEither<
  { errorMessage: string; status: number },
  { successMessage: string; status: number }
> => {
  return F.pipe(
    TE.Do,
    TE.bind("days", () => {
      const days = Number(formData.get("days"));
      if (Number.isNaN(days)) {
        return TE.left({
          errorMessage: "days must be a number",
          status: 400,
        } as const);
      }
      return TE.right(days);
    }),
    TE.bindW("min", () => {
      const min = formData.get("hour_min");
      if (typeof min !== "string" || min === "") {
        return TE.left({
          errorMessage: "hour_min must be a string",
          status: 400,
        });
      }
      const match = min.matchAll(/^(\d{2}):(\d{2})$/g);
      const [_, _hours, _minutes] = Array.from(match)[0];
      const hours = Number(_hours);
      const minutes = Number(_minutes);
      if (Number.isNaN(Number(hours)) || Number.isNaN(Number(minutes))) {
        return TE.left({
          errorMessage: "invalid hour_min format",
          status: 400,
        });
      }
      return TE.right(hours * 60 + minutes);
    }),
    TE.bindW("url", () => {
      const url = formData.get("url");
      if (url instanceof File) {
        return TE.left({
          errorMessage: "url must be a string",
          status: 400,
        });
      }
      return TE.right(url);
    }),
    TE.flatMap(({ days, min, url }) => {
      return TE.tryCatch(
        async () => {
          const watchDelaySecFromPublish = days * 24 * 60 * 60 + min * 60;
          await db.subscribedWorksOnUser.update({
            where: { userId_workId: { userId, workId } },
            data: {
              watchDelaySecFromPublish: watchDelaySecFromPublish || null,
              watchUrl: url,
            },
          });
          return {
            successMessage: "watch settings is successfully updated",
            status: 200,
          };
        },
        (error) => {
          console.error(error);
          return {
            errorMessage: "internal server error",
            status: 500,
          };
        },
      );
    }),
  );
};
