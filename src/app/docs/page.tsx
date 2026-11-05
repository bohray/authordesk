import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = { title: "API docs" };

/** Pinned so a CDN release can never change what this page runs. */
const SWAGGER_UI = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14";

// Loads the stylesheet and bundle in order, then mounts Swagger UI. Done in one inline
// script so the page stays a Server Component and the bundle is fetched only here.
const init = `
(function () {
  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "${SWAGGER_UI}/swagger-ui.css";
  document.head.appendChild(css);
  var js = document.createElement("script");
  js.src = "${SWAGGER_UI}/swagger-ui-bundle.js";
  js.crossOrigin = "anonymous";
  js.onload = function () {
    window.SwaggerUIBundle({
      url: "/api/v1/openapi.json",
      dom_id: "#swagger-ui",
      deepLinking: true,
      withCredentials: true,
    });
  };
  document.body.appendChild(js);
})();
`;

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div id="swagger-ui" />
      <Script id="swagger-ui-init" strategy="afterInteractive">
        {init}
      </Script>
    </main>
  );
}
