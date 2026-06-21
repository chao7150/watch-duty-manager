import { useState } from "react";
import {
  Form,
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import * as MenuIcon from "~/components/Icons/Menu";
import * as MobileNavigation from "~/components/mobileNavigation";

import { cour2symbol, date2cour } from "~/domain/cour/util";
import { bindUrl as bindUrlForKnowledge } from "~/routes/knowledge._index";
import { bindUrl as bindUrlForMy } from "~/routes/my";
import { bindUrl as bindUrlForWorks } from "~/routes/works._index";

import { getUserId } from "~/utils/session.server";

import type { Route } from "./+types/root";
import styles from "./styles/global.css?url";

export const links: Route.LinksFunction = () => {
  return [{ rel: "stylesheet", href: styles }];
};

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Watch duty manager" },
    { name: "description", content: "アニメの視聴管理をするwebサービスです" },
  ];
};

export function Layout({ children }: { children: React.ReactNode }) {
  const userId = useRouteLoaderData<Awaited<ReturnType<typeof loader>>>("root");

  return <Document userId={userId}>{children}</Document>;
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
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
  userId,
}: {
  children: React.ReactNode;
  title?: string;
  userId?: Awaited<ReturnType<typeof loader>>;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text x=%2250%%22 y=%2250%%22 style=%22dominant-baseline:central;text-anchor:middle;font-size:90px;%22>📜</text></svg>"
        ></link>
        {title ? <title>{title}</title> : null}
        <Meta />
        <Links />
      </head>
      <body>
        <LayoutBody userId={userId}>{children}</LayoutBody>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export const loader = ({ request }: Route.LoaderArgs) => {
  const userId = getUserId(request);
  return userId;
};

function LayoutBody({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: Awaited<ReturnType<typeof loader>> | undefined;
}) {
  const [mobileMenuOpened, setMobileMenuOpened] = useState<boolean>(false);

  return (
    <div className="app-shell bg-dark text-text">
      <header className="app-shell__header">
        <div className="flex items-center justify-between flex-wrap w-11/12 mx-auto">
          <h1>
            <Link to="/" title="Watch Duty Manager">
              Watch Duty Manager
            </Link>
          </h1>
          <nav
            aria-label="Main navigation"
            className="app-shell__header-nav max-lg:hidden"
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
                <Link to={bindUrlForKnowledge({})}>Knowledge</Link>
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
            type="button"
            aria-label="メニューを開く"
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
      <div className="app-shell__main">
        <div className="w-11/12 mx-auto py-8">{children}</div>
      </div>
      <footer className="app-shell__footer">
        <div className="app-shell__footer-content">
          <p>&copy; chao7150</p>
        </div>
      </footer>
    </div>
  );
}
