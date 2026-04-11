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

export const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};
