import { Capacitor } from "@capacitor/core";
import { Keyboard, KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";
import { StatusBar, Style } from "@capacitor/status-bar";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const pwaEnabled = import.meta.env.VITE_PWA_ENABLED !== "false";
const ghosEmbedded = import.meta.env.VITE_GHOS_EMBEDDED === "true";

document.documentElement.classList.toggle("ghos-embedded", ghosEmbedded);

if (ghosEmbedded && window.parent !== window) {
  let resizeFrame = 0;
  let lastHeight = 0;

  const publishEmbeddedSize = () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );

      if (Math.abs(height - lastHeight) < 2) return;
      lastHeight = height;
      window.parent.postMessage(
        {
          type: "ghos:ticket-creator:resize",
          height,
          path: window.location.pathname,
        },
        "*",
      );
    });
  };

  window.addEventListener("load", publishEmbeddedSize);
  window.addEventListener("resize", publishEmbeddedSize);
  new ResizeObserver(publishEmbeddedSize).observe(document.documentElement);
  new MutationObserver(publishEmbeddedSize).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
}

if (!pwaEnabled) {
  document.querySelector('link[rel="manifest"]')?.remove();
  document.querySelectorAll(
    'meta[name="apple-mobile-web-app-capable"], meta[name="mobile-web-app-capable"], meta[name="apple-mobile-web-app-status-bar-style"], meta[name="apple-mobile-web-app-title"]',
  ).forEach((element) => element.remove());
}

async function configureNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.classList.add("native-shell");
  document.documentElement.classList.toggle("native-ios", Capacitor.getPlatform() === "ios");

  if (Capacitor.getPlatform() !== "ios") return;

  await Promise.allSettled([
    StatusBar.setOverlaysWebView({ overlay: false }),
    StatusBar.setStyle({ style: Style.Dark }),
    Keyboard.setResizeMode({ mode: KeyboardResize.Native }),
    Keyboard.setStyle({ style: KeyboardStyle.Light }),
  ]);

  const setKeyboardHeight = (height: number) => {
    document.documentElement.style.setProperty("--keyboard-height", `${height}px`);
    document.body.classList.toggle("keyboard-open", height > 0);
  };

  await Promise.allSettled([
    Keyboard.addListener("keyboardWillShow", ({ keyboardHeight }) => setKeyboardHeight(keyboardHeight)),
    Keyboard.addListener("keyboardWillHide", () => setKeyboardHeight(0)),
  ]);
}

void configureNativeShell();

if (!Capacitor.isNativePlatform() && pwaEnabled && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const announceUpdate = (registration: ServiceWorkerRegistration) => {
      window.dispatchEvent(new CustomEvent("pwa:update-ready", { detail: registration }));
    };

    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (registration.waiting) {
        announceUpdate(registration);
      }

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            announceUpdate(registration);
          }
        });
      });
    }).catch((error) => {
      console.error("Service worker registration failed", error);
    });
  });
}

if (!Capacitor.isNativePlatform() && !pwaEnabled && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(
        registrations.map((registration) => registration.unregister()),
      ))
      .catch((error) => {
        console.warn("Unable to remove prior service worker registrations", error);
      });

    if ("caches" in window) {
      void caches.keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch((error) => {
          console.warn("Unable to clear prior PWA caches", error);
        });
    }
  });
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

window.requestAnimationFrame(() => {
  window.setTimeout(() => {
    document.getElementById("app-startup")?.remove();
  }, 120);
});
