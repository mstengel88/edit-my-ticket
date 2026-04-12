import type { CapacitorConfig } from "@capacitor/cli";

const config = {
  appId: "com.ticketcreator.app",
  appName: "Ticket Creator",
  webDir: "dist",
  bundledWebRuntime: false,
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#F2F7F5",
    },
    Keyboard: {
      resize: "native",
      style: "LIGHT",
    },
  },
  packageClassList: ["SignInWithApple", "KeyboardPlugin", "StatusBarPlugin", "NativePrintPlugin"],
} satisfies CapacitorConfig & { packageClassList: string[] };

export default config;
