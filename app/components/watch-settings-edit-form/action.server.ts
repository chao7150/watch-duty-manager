import { db } from "~/utils/db.server";
import type { Result } from "~/utils/result";
import { Err, Ok } from "~/utils/result";

type SuccessResult = { successMessage: string; status: number };
type ErrorResult = { errorMessage: string; status: number };

export const serverAction = async (
  userId: string,
  workId: number,
  formData: FormData,
): Promise<Result<SuccessResult, ErrorResult>> => {
  const days = Number(formData.get("days"));
  if (Number.isNaN(days)) {
    return Err({ errorMessage: "days must be a number", status: 400 });
  }

  const hourMin = formData.get("hour_min");
  if (typeof hourMin !== "string" || hourMin === "") {
    return Err({ errorMessage: "hour_min must be a string", status: 400 });
  }
  const match = hourMin.matchAll(/^(\d{2}):(\d{2})$/g);
  const [_, _hours, _minutes] = Array.from(match)[0];
  const hours = Number(_hours);
  const minutes = Number(_minutes);
  if (Number.isNaN(Number(hours)) || Number.isNaN(Number(minutes))) {
    return Err({ errorMessage: "invalid hour_min format", status: 400 });
  }
  const totalMinutes = hours * 60 + minutes;

  const url = formData.get("url");
  if (url instanceof File) {
    return Err({ errorMessage: "url must be a string", status: 400 });
  }

  const watchDelaySecFromPublish = days * 24 * 60 * 60 + totalMinutes * 60;

  try {
    await db.subscribedWorksOnUser.update({
      where: { userId_workId: { userId, workId } },
      data: {
        watchDelaySecFromPublish: watchDelaySecFromPublish || null,
        watchUrl: url,
      },
    });
    return Ok({
      successMessage: "watch settings is successfully updated",
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return Err({ errorMessage: "internal server error", status: 500 });
  }
};
