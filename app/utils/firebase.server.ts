import {
  type App,
  applicationDefault,
  getApps,
  initializeApp,
} from "firebase-admin/app";

export function getAdmin(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return initializeApp({ credential: applicationDefault() });
}
