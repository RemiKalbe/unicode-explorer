import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { useDynamicFavicon } from "./hooks/useDynamicFavicon";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  useDynamicFavicon();
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-softcreme-98 dark:bg-darkzinc p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-olive-41 dark:text-olive-65 mb-4">
          {message}
        </h1>
        <p className="text-darkzinc-21 dark:text-lightzinc-40">{details}</p>
        {stack && (
          <pre className="mt-4 p-4 bg-softcreme-94 dark:bg-darkzinc-6 text-xs text-left overflow-auto max-w-2xl">
            {stack}
          </pre>
        )}
      </div>
    </main>
  );
}
