import * as E from "fp-ts/lib/Either.js";
import * as TE from "fp-ts/lib/TaskEither.js";
import type { Result } from "~/utils/result";

export const resultToEither = <T, E>(result: Result<T, E>): E.Either<E, T> => {
  if (result.err) {
    return E.left(result.err);
  }
  return E.right(result.ok as T);
};

export const resultToTaskEither = <E, T>(
  result: Result<T, E>,
): TE.TaskEither<E, T> => {
  if (result.err) {
    return TE.left(result.err);
  }
  return TE.right(result.ok as T);
};

export const awaitResultToTaskEither = <E, T>(
  promise: Promise<Result<T, E>>,
): TE.TaskEither<E, T> => {
  return TE.tryCatch(
    async () => {
      const result = await promise;
      if (result.err) {
        throw result.err;
      }
      return result.ok as T;
    },
    (e) => e as E,
  );
};
