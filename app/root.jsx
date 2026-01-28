import { Links, Meta, Outlet, Scripts } from "@remix-run/react";
import './wallet-fix'; 

export const links = () => [
  { rel: "stylesheet", href: styles }
];

export default function Root() {
  return (
    // Agrega suppressHydrationWarning aquí ↓
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      {/* Y también aquí ↓ */}
      <body suppressHydrationWarning>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
