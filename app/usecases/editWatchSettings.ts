import type { WatchRepository } from "~/domain/watch/repository";
import type { AppError, Result } from "~/utils/result";
import { Err, Ok } from "~/utils/result";

type EditWatchSettingsInput = {
  days: number;
  hourMin: string;
  url: string | null;
};

type EditWatchSettingsResult = { successMessage: string };

const parseFormData = (
  formData: FormData,
): Result<EditWatchSettingsInput, AppError> => {
  const days = Number(formData.get("days"));
  if (Number.isNaN(days)) {
    return Err({ type: "validation", message: "days must be a number" });
  }

  const hourMin = formData.get("hour_min");
  if (typeof hourMin !== "string" || hourMin === "") {
    return Err({ type: "validation", message: "hour_min must be a string" });
  }
  const match = [...hourMin.matchAll(/^(\d{2}):(\d{2})$/g)][0];
  if (!match) {
    return Err({ type: "validation", message: "invalid hour_min format" });
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Err({ type: "validation", message: "invalid hour_min format" });
  }

  const url = formData.get("url");
  if (url instanceof File) {
    return Err({ type: "validation", message: "url must be a string" });
  }

  return Ok({ days, hourMin, url });
};

export const editWatchSettings =
  (repos: { watchRepo: WatchRepository }) =>
  async (
    userId: string,
    workId: number,
    formData: FormData,
  ): Promise<Result<EditWatchSettingsResult, AppError>> => {
    const parsed = parseFormData(formData);
    if (parsed.err) return parsed;

    const { days, hourMin, url } = parsed.ok;
    const [_hours, _minutes] = hourMin.split(":").map(Number);
    const totalMinutes = _hours * 60 + _minutes;
    const watchDelaySecFromPublish = days * 24 * 60 * 60 + totalMinutes * 60;

    const result = await repos.watchRepo.updateWatchSettings(userId, workId, {
      watchDelaySecFromPublish: watchDelaySecFromPublish || null,
      watchUrl: url,
    });
    if (result.err) return result;

    return Ok({
      successMessage: "watch settings is successfully updated",
    });
  };
