import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { logout } from "~/utils/session.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  return logout(request);
};

export const loader = async () => {
  return redirect("/");
};
