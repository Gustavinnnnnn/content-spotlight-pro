import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const installManifest = () => {
  const manifestHref = "/manifest.webmanifest";
  if (!document.querySelector(`link[rel=\"manifest\"][href=\"${manifestHref}\"]`)) {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = manifestHref;
    document.head.appendChild(link);
  }
};

const registerPushWorker = async () => {
  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const isPreviewHost = window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");

  if (!("serviceWorker" in navigator)) return;

  if (isPreviewHost || isInIframe) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    return;
  }

  await navigator.serviceWorker.register("/sw.js");
};

installManifest();
void registerPushWorker();

createRoot(document.getElementById("root")!).render(<App />);
