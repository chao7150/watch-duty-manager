import { LoaderFunction, useLoaderData } from "remix";
import { requireUserId } from "~/utils/session.server";

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = requireUserId(request);
  return userId;
};

export default function My() {
  const userId = useLoaderData();

  return <div>{userId}</div>;
}
