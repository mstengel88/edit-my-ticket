import { Capacitor } from "@capacitor/core";

export const isNativeAppleSignInAvailable = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

export const getAppleSignInConfig = () => {
  const clientId = import.meta.env.VITE_APPLE_CLIENT_ID?.trim();
  const redirectURI = import.meta.env.VITE_APPLE_REDIRECT_URI?.trim();

  return {
    clientId,
    redirectURI,
    isConfigured: Boolean(clientId && redirectURI),
  };
};

export const createRandomString = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};
