import { applicationDefault } from "firebase-admin/app";
import * as admin from "firebase-admin";

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
