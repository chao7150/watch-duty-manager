import * as admin from "firebase-admin";
import { applicationDefault } from "firebase-admin/app";

export function getAdmin(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  } else {
    const app = admin.initializeApp({
      credential: applicationDefault(),
      databaseURL: "https://<DATABASE_NAME>.firebaseio.com",
    });
    return app;
  }
}
