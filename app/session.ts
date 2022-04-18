import { createCookieSessionStorage } from "remix";

const ONE_WEEK_SEC = 60 * 60 * 24 * 7;

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage({
    // a Cookie from `createCookie` or the CookieOptions to create one
    cookie: {
      name: "__session",
      // all of these are optional
      expires: new Date(Date.now() + ONE_WEEK_SEC),
      httpOnly: true,
      maxAge: ONE_WEEK_SEC,
      path: "/",
      sameSite: "lax",
      secrets: ["s3cret1"],
      secure: true,
    },
  });

export { getSession, commitSession, destroySession };
