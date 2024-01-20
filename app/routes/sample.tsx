import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { db } from "~/utils/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const users = await db.user.findMany();
  return json({ users }, { status: 500 });
};

const Component = () => {
  const { users } = useLoaderData<typeof loader>();
  return <div>{users[0].createdAt}</div>;
};

export default Component;
