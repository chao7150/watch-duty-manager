import { redirect } from "react-router";

import { logout } from "~/utils/session.server";

import type { Route } from "./+types/logout";

export const action = async ({ request }: Route.ActionArgs) => {
  return logout(request);
};

export const loader = async () => {
  return redirect("/");
};
