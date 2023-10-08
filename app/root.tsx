import type { LinksFunction } from "@remix-run/node";
import { LoaderFunction } from "@remix-run/node";

import {
  Form,
  isRouteErrorResponse,
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";

import { getUserId } from "./utils/session.server";
import styles from "./tailwind.css";
import { cour2symbol, date2cour } from "./domain/cour/util";
import globalStylesUrl from "~/styles/global.css";
import sharedStylesUrl from "~/styles/shared.css";
import { bindUrl as bindUrlForMy } from "./routes/my";
import { bindUrl as bindUrlForWorks } from "./routes/works._index";

// https://remix.run/api/app#links
export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: globalStylesUrl },
    { rel: "stylesheet", href: sharedStylesUrl },
    { rel: "stylesheet", href: styles },
  ];
};

// https://remix.run/api/conventions#default-export
// https://remix.run/api/conventions#route-filenames
export default function App() {
  return (
    <Document>
      <Layout>
        <Outlet />
      </Layout>
    </Document>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (error instanceof Error) {
    return <div>An unexpected error occurred: {error.message}</div>;
  }

  if (!isRouteErrorResponse(error)) {
    return <h1>Unknown Error</h1>;
  }

  if (error.status === 404) {
    return <div>Note not found</div>;
  }

  return <div>An unexpected error occurred: {error.statusText}</div>;
}

function Document({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {title ? <title>{title}</title> : null}
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
}

export const loader: LoaderFunction = ({ request }) => {
  const userId = getUserId(request);
  return userId;
};

function Layout({ children }: { children: React.ReactNode }) {
  const userId = useLoaderData();

  return (
    <div className="remix-app bg-dark text-text">
      <header className="remix-app__header">
        <div className="remix-app__header-content w-11/12 mx-auto">
          <h1>
            <Link to="/" title="Watch Duty Manager">
              Watch Duty Manager
            </Link>
          </h1>
          <nav aria-label="Main navigation" className="remix-app__header-nav">
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to={bindUrlForWorks({ "?query": { cour: cour2symbol(date2cour(new Date())) } })}>
                  Works
                </Link>
              </li>
              <li>
                <Link to="/create">Create</Link>
              </li>

              {userId ? (
                <>
                  <li>
                    <Link to={bindUrlForMy({ "?query": { cour: cour2symbol(date2cour(new Date())) } })}>
                      My
                    </Link>
                  </li>
                  <li className="text-link">
                    <Form action="/logout" method="POST">
                      <button type="submit">Logout</button>
                    </Form>
                  </li>
                </>
              ) : (
                <li>
                  <Link to="/login">Login</Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </header>
      <div className="remix-app__main">
        <div className="w-11/12 mx-auto py-8">{children}</div>
      </div>
      <footer className="remix-app__footer">
        <div className="remix-app__footer-content">
          <p>&copy; chao7150</p>
        </div>
      </footer>
    </div>
  );
}
