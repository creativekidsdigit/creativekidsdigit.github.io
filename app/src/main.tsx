import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

const originalFetch = window.fetch;
if (originalFetch) {
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let headers: Record<string, string> | undefined;
    let hasBadHeader = false;
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          if (typeof value === "string" && /[^\x00-\x7F]/.test(value)) {
            hasBadHeader = true;
            console.warn(`[fetch] non-ASCII header detected: ${key}`, value);
          }
        });
      } else if (typeof init.headers === "object" && init.headers !== null) {
        headers = Object.fromEntries(
          Object.entries(init.headers).map(([k, v]) => [
            k,
            typeof v === "string" ? v : String(v ?? ""),
          ])
        );
        for (const [k, v] of Object.entries(headers)) {
          if (typeof v === "string" && /[^\x00-\x7F]/.test(v)) {
            hasBadHeader = true;
            console.warn(`[fetch] non-ASCII header detected: ${k}`, v);
          }
        }
      }
    }
    if (hasBadHeader) {
      console.trace("[fetch] call stack for request with non-ASCII headers");
    }
    return originalFetch.call(window, input, init);
  };
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
