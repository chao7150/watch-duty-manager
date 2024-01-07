import { LoaderFunctionArgs } from "@remix-run/node";

import { db } from "~/utils/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await db.work.count();
    return new Response("OK");
  } catch (error) {
    console.log("healthcheck failed.", error);
    return new Response("ERROR", { status: 500 });
  }
};
