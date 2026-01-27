// root.jsx simplificado
import { Links, Meta, Outlet, Scripts } from "@remix-run/react";

export default function Root() {
  return (
      <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
    </head>
      <body suppressHydrationWarning>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
