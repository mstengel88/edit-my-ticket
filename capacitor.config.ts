import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
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
};

export default config;
