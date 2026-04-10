import { Capacitor } from "@capacitor/core";
import { Keyboard, KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";
import { StatusBar, Style } from "@capacitor/status-bar";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

createRoot(document.getElementById("root")!).render(<App />);
