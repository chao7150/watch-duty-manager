import { DataFunctionArgs } from "@remix-run/server-runtime";
import React from "react";
import { StyledFirebaseAuth } from "react-firebaseui";
import type { MetaFunction } from "remix";
import { useLoaderData } from "remix";
import firebase from "firebase/compat/app";
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

const firebaseConfig = {
  apiKey: "AIzaSyB5KP2tECCIvtP5AP7uLyQQP9sR9gajYdg",
  authDomain: "watch-duty-manager.firebaseapp.com",
  projectId: "watch-duty-manager",
  storageBucket: "watch-duty-manager.appspot.com",
  messagingSenderId: "205562074111",
  appId: "1:205562074111:web:f2659018b342dcc9578dca",
  measurementId: "G-YNB0BEJ5GC",
};

if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
  firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
}

const uiConfig: firebaseui.auth.Config = {
  signInFlow: "popup",
  signInOptions: [firebase.auth.EmailAuthProvider.PROVIDER_ID],
  callbacks: {
    signInSuccessWithAuthResult: () => false,
  },
};

// https://remix.run/guides/routing#index-routes
export default function Index() {
  const data = useLoaderData<IndexData>();
  const { userId } = data;

  React.useEffect(() => {
    const unregisterAuthObserver = firebase
      .auth()
      .onAuthStateChanged(async (user) => {
        if (user === null) {
          return;
        }
        // tokenをheaderに入れてサーバーに送り、サーバー側でtokenをfirebaseと照合する
        // ユーザーが確認できたらset-cookieでクライアント側にcookieを設定する
        const token = await user.getIdToken();
        fetch("./sessionLogin", {
          method: "POST",
          headers: new Headers({
            Authorization: token ? `Bearer ${token}` : "",
          }),
        });
      });
    return () => unregisterAuthObserver(); // Make sure we un-register Firebase observers when the component unmounts.
  }, []);

  return userId ? (
    <div className="remix__page">logged in</div>
  ) : (
    <StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={firebase.auth()} />
  );
}
