import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost = window.location.hostname.includes("id-preview--");

if ("serviceWorker" in navigator) {
  if (isPreviewHost || isInIframe) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  } else {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
