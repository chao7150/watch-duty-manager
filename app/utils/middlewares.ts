import * as E from "fp-ts/lib/Either.js";
import * as TE from "fp-ts/lib/TaskEither.js";
import { redirect } from "react-router";

import { getUserSession } from "./session.server";

type RequestArgs = {
  request: Request;
};

export const requireUserIdTaskEither = (redirectTo: string | undefined) =>
  TE.chain(({ request }: RequestArgs) => async () => {
    const session = await getUserSession(request);
    const userId = session.get("uid");
    if (!userId || typeof userId !== "string") {
      const searchParams = new URLSearchParams([
        ["redirectTo", redirectTo ?? new URL(request.url).pathname],
      ]);
      return E.left(redirect(`/login?${searchParams}`));
    }
    return E.right({ userId });
  });
