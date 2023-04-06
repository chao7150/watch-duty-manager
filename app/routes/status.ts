import { LoaderArgs } from "@remix-run/node";
import { db } from "~/utils/db.server";

export const loader = async ({ request }: LoaderArgs) => {
  try {
    await db.work.count();
    return new Response("OK");
  } catch (error) {
    console.log("healthcheck failed.", error);
    return new Response("ERROR", { status: 500 });
  }
};
