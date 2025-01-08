import type {
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import {
  Form,
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";

import { useState } from "react";

import { bindUrl as bindUrlForMy } from "~/routes/my";
import { bindUrl as bindUrlForWorks } from "~/routes/works._index";
import globalStylesUrl from "~/styles/global.css?url";

import { cour2symbol, date2cour } from "~/domain/cour/util";

import * as MenuIcon from "~/components/Icons/Menu";
import * as MobileNavigation from "~/components/mobileNavigation";

import { getUserId } from "~/utils/session.server";

import styles from "./tailwind.css?url";

// https://remix.run/api/app#links
export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: globalStylesUrl },
    { rel: "stylesheet", href: styles },
  ];
};

// https://remix.run/api/conventions#meta
export const meta: MetaFunction = () => {
  return [
    { title: "Watch duty manager" },
    { name: "description", content: "アニメの視聴管理をするwebサービスです" },
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
      </body>
    </html>
  );
}

export const loader = ({ request }: LoaderFunctionArgs) => {
  const userId = getUserId(request);
  return userId;
};

function Layout({ children }: { children: React.ReactNode }) {
  const userId = useLoaderData<typeof loader>();
  const [mobileMenuOpened, setMobileMenuOpened] = useState<boolean>(false);

  return (
    <div className="remix-app bg-dark text-text">
      <header className="remix-app__header">
        <div className="flex items-center justify-between flex-wrap w-11/12 mx-auto">
          <h1>
            <Link to="/" title="Watch Duty Manager">
              Watch Duty Manager
            </Link>
          </h1>
          <nav
            aria-label="Main navigation"
            className="remix-app__header-nav max-lg:hidden"
          >
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link
                  to={bindUrlForWorks({
                    "?query": { cour: cour2symbol(date2cour(new Date())) },
                  })}
                >
                  Works
                </Link>
              </li>
              <li>
                <Link to="/create">Create</Link>
              </li>
              <li>
                <Link
                  to="https://chao7150.notion.site/wdm-help-82a9677f1ae545e7be3ee110a2c40068?pvs=4"
                  target="_blank"
                >
                  Help
                </Link>
              </li>

              {userId ? (
                <>
                  <li>
                    <Link
                      to={bindUrlForMy({
                        "?query": { cour: cour2symbol(date2cour(new Date())) },
                      })}
                    >
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
          <button
            className="lg:hidden"
            onClick={() => setMobileMenuOpened((o) => !o)}
          >
            <MenuIcon.Component />
          </button>
          {mobileMenuOpened && (
            <div className="lg:hidden w-full ">
              <MobileNavigation.Component userId={userId ?? undefined} />
            </div>
          )}
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
