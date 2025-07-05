import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";

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
  const navigate = useNavigate();
  const [firebaseAuth] = useState(() => {
    const app = initializeApp(firebaseConfig);
    return getAuth(app);
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const login = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!email || !password) return;
      setIsLoading(true);
      setError("");
      try {
        const userCredential = await signInWithEmailAndPassword(
          firebaseAuth,
          email,
          password,
        );
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
        navigate("/");
      } catch (error: unknown) {
        setIsLoading(false);
        if (error && typeof error === "object" && "code" in error) {
          // Firebaseのエラーコードに応じたメッセージ
          switch (error.code) {
            case "auth/user-disabled":
            case "auth/user-not-found":
            case "auth/wrong-password":
            case "auth/invalid-credential":
              setError("メールアドレスまたはパスワードが正しくありません");
              break;
            case "auth/network-request-failed":
              setError("ネットワークエラーが発生しました");
              break;
            default:
              setError("ログインに失敗しました");
          }
        }
        setError("ログインに失敗しました");
      }
    },
    [email, password, firebaseAuth, navigate],
  );

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-accent-area rounded-lg p-6 shadow-lg border border-outline">
          <h1 className="text-2xl font-semibold text-text mb-6 text-center">
            Watch Duty Manager
          </h1>
          <form className="space-y-4" onSubmit={login}>
            {error && (
              <div className="p-3 rounded-md bg-red bg-opacity-10 border border-red border-opacity-20">
                <p className="text-sm text-red">{error}</p>
              </div>
            )}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-weak mb-2"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-dark border border-outline rounded-md text-text focus:outline-none focus:border-link focus:ring-1 focus:ring-link disabled:opacity-50 disabled:cursor-not-allowed invalid:border-red invalid:focus:ring-red invalid:focus:border-red"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-weak mb-2"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-dark border border-outline rounded-md text-text focus:outline-none focus:border-link focus:ring-1 focus:ring-link disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-2 px-4 bg-link text-dark font-medium rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-link focus:ring-offset-2 focus:ring-offset-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
