import { ActionFunction } from "@remix-run/server-runtime";
import { commitSession, getSession } from "~/session";
import { getAdmin } from "~/utils/firebase.server";

const FIVE_DAYS_MS = 60 * 60 * 24 * 5 * 1000;

/**
 * トークンをfirebaseに問い合わせてuidを得る
 * uidをSet-Cookieするレスポンスを返す
 */
export const action: ActionFunction = async ({ request }) => {
  const authorizationHeader = request.headers.get("Authorization");
  if (
    authorizationHeader === null ||
    !authorizationHeader.startsWith("Bearer ")
  ) {
    return new Response("Authorization header must be set", { status: 400 });
  }
  const idToken = authorizationHeader.substring(7, authorizationHeader.length);
  const admin = getAdmin();
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const uid = decodedToken.uid;
  const session = await getSession();
  session.set("uid", uid);
  return new Response("logged in", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
};
