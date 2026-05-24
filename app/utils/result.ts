type Result<T, E = AppError> = { ok: T; err?: never } | { ok?: never; err: E };

const Ok = <T>(value: T): Result<T, never> => ({ ok: value });
const Err = <E>(error: E): Result<never, E> => ({
  err: error,
});

export type { Result };
export { Err, Ok };

// ── AppError ──────────────────────────────────────────

interface FieldError {
  field: string;
  message: string;
}

type AppError =
  | { type: "not_found"; resource: string; id: string | number }
  | { type: "validation"; message: string; fields?: FieldError[] }
  | { type: "unique_constraint"; duplicatedFields: string[] }
  | { type: "unauthorized"; redirectTo?: string }
  | { type: "forbidden" }
  | { type: "db"; message: string; cause?: unknown }
  | { type: "internal"; message: string };

export type { AppError, FieldError };

// ── Helpers ──────────────────────────────────────────

export const tryResult = async <T>(
  fn: () => Promise<T>,
  onError: (e: unknown) => AppError,
): Promise<Result<T, AppError>> => {
  try {
    return Ok(await fn());
  } catch (e) {
    return Err(onError(e));
  }
};

export const errorToStatus = (err: AppError): number => {
  switch (err.type) {
    case "not_found":
      return 404;
    case "validation":
      return 400;
    case "unique_constraint":
      return 409;
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "db":
      return 500;
    case "internal":
      return 500;
  }
};

export const errorToMessage = (err: AppError): string => {
  switch (err.type) {
    case "not_found":
      return `${err.resource}が見つかりません`;
    case "validation":
      return err.message;
    case "unique_constraint":
      return `既に登録されています: ${err.duplicatedFields.join(", ")}`;
    case "unauthorized":
      return "ログインが必要です";
    case "forbidden":
      return "権限がありません";
    case "db":
      return "内部エラーが発生しました";
    case "internal":
      return err.message;
  }
};
