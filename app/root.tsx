import type { LinksFunction } from "@remix-run/node";
import { LoaderFunction } from "@remix-run/node";

import {
  Form,
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
  useLoaderData,
} from "@remix-run/react";

import { getUserId } from "./utils/session.server";
import styles from "./styles/app.css";
import globalStylesUrl from "~/styles/global.css";
import sharedStylesUrl from "~/styles/shared.css";

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

// https://remix.run/docs/en/v1/api/conventions#errorboundary
export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
  return (
    <Document title="Error!">
      <Layout>
        <div>
          <h1>There was an error</h1>
          <p>{error.message}</p>
        </div>
      </Layout>
    </Document>
  );
}

// https://remix.run/docs/en/v1/api/conventions#catchboundary
export function CatchBoundary() {
  const caught = useCatch();
  let message;
  switch (caught.status) {
    case 400:
      message = <p>{caught.data}</p>;
      break;
    case 401:
      message = (
        <p>
          Oops! Looks like you tried to visit a page that you do not have access
          to.
        </p>
      );
      break;
    case 404:
      message = (
        <p>Oops! Looks like you tried to visit a page that does not exist.</p>
      );
      break;

    default:
      throw new Error(caught.data || caught.statusText);
  }

  return (
    <Document title={`${caught.status} ${caught.statusText}`}>
      <Layout>
        <h1>
          {caught.status}: {caught.statusText}
        </h1>
        {message}
      </Layout>
    </Document>
  );
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
                <Link to="/works">Works</Link>
              </li>
              <li>
                <Link to="/create">Create</Link>
              </li>

              {userId ? (
                <>
                  <li>
                    <Link to="/my">My</Link>
                  </li>
                  <li className="text-link">
                    <Form action="/logout" method="post">
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
