import { DataFunctionArgs } from "@remix-run/server-runtime";
import type { MetaFunction } from "remix";
import { useLoaderData } from "remix";
import "firebase/compat/auth";
import { getSession } from "~/session";

type IndexData = {
  userId: string | undefined;
};

const defaultData: IndexData = { userId: undefined };
export const loader = async (args: DataFunctionArgs): Promise<IndexData> => {
  const session = await getSession(args.request.headers.get("Cookie"));
  if (!session.has("uid")) {
    return defaultData;
  }
  const userId = session.get("uid");
  if (typeof userId !== "string") {
    return defaultData;
  }
  return {
    userId,
  };
};

// https://remix.run/api/conventions#meta
export const meta: MetaFunction = () => {
  return {
    title: "Watch duty manager",
    description: "Welcome to remix!",
  };
};

// https://remix.run/guides/routing#index-routes
export default function Index() {
  const data = useLoaderData<IndexData>();
  const { userId } = data;

  return userId ? (
    <div className="remix__page">logged in</div>
  ) : (
    <div>not logged in</div>
  );
}
