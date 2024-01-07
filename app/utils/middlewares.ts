import { redirect } from "@remix-run/node";
import { type DataFunctionArgs } from "@remix-run/server-runtime";

import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

import { getUserSession } from "./session.server";

export const requireUserIdTaskEither = (redirectTo: string | undefined) =>
  TE.chain(({ request }: DataFunctionArgs) => async () => {
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
