import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { useCallback, useState } from "react";

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

import { getAdmin } from "~/utils/firebase.server";
import {
  commitSession,
  getSession,
  getUserId,
  ONE_WEEK_SEC,
} from "~/utils/session.server";

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: "https://www.gstatic.com/firebasejs/ui/6.0.2/firebase-ui-auth.css",
    },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) {
    return redirect("/");
  }
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
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
  return new Response("/", {
    headers: {
      "Set-Cookie": await commitSession(session, {
        expires: new Date(Date.now() + ONE_WEEK_SEC),
      }),
    },
  });
};

const firebaseConfig = {
  apiKey: "AIzaSyB5KP2tECCIvtP5AP7uLyQQP9sR9gajYdg",
  authDomain: "watch-duty-manager.firebaseapp.com",
  projectId: "watch-duty-manager",
  storageBucket: "watch-duty-manager.appspot.com",
  messagingSenderId: "205562074111",
  appId: "1:205562074111:web:f2659018b342dcc9578dca",
  measurementId: "G-YNB0BEJ5GC",
};

export default function Login() {
  const [firebaseAuth] = useState(() => {
    const app = initializeApp(firebaseConfig);
    return getAuth(app);
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useCallback(async () => {
    if (!email || !password) return;
    try {
      const userCredential = await signInWithEmailAndPassword(
        firebaseAuth,
        email,
        password,
      );
      console.log("userCredential", userCredential);
      const user = userCredential.user;
      if (user === null) {
        return;
      }
      // tokenをheaderに入れてサーバーに送り、サーバー側でtokenをfirebaseと照合する
      // ユーザーが確認できたらset-cookieでクライアント側にcookieを設定する
      const token = await user.getIdToken();
      await fetch("./login", {
        method: "POST",
        headers: new Headers({
          Authorization: token ? `Bearer ${token}` : "",
        }),
      });
      // Set-Cookie後にリダイレクトする
      // 本当にこんな書き方でいいのかだいぶ怪しい
      location.href = "/";
    } catch (error) {
      // TODO なんかする
      console.error(error);
    }
  }, [email, password, firebaseAuth]);

  return (
    <div>
      <form>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="button" onClick={login}>
          Login
        </button>
      </form>
    </div>
  );
}
