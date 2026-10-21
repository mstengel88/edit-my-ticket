import { useEffect, useState, useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const isGhosBuild = import.meta.env.VITE_GHOS_EMBEDDED === "true";
const embeddedPermissions = new Set<string>();
const permissionListeners = new Set<() => void>();

export const ghosTicketPermissions = {
  createEdit: "actions.ticketing.create-edit",
  print: "actions.ticketing.print",
  email: "actions.ticketing.email",
  void: "actions.ticketing.void",
  settings: "actions.ticketing.settings",
} as const;

export const isGhosEmbedded = () =>
  isGhosBuild && window.parent !== window;

export const hasGhosPermission = (permission: string) =>
  !isGhosEmbedded() || embeddedPermissions.has(permission);

const subscribeToPermissions = (listener: () => void) => {
  permissionListeners.add(listener);
  return () => permissionListeners.delete(listener);
};

const replaceEmbeddedPermissions = (permissions: unknown) => {
  embeddedPermissions.clear();
  if (Array.isArray(permissions)) {
    for (const permission of permissions) {
      if (typeof permission === "string" && permission.length <= 100) {
        embeddedPermissions.add(permission);
      }
    }
  }
  for (const listener of permissionListeners) listener();
};

export const useGhosPermission = (permission: string) =>
  useSyncExternalStore(
    subscribeToPermissions,
    () => hasGhosPermission(permission),
    () => false,
  );

export const GhosOnlyNotice = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0d1522] px-6 text-white">
    <div className="max-w-lg text-center">
      <h1 className="text-2xl font-semibold">Open Ticket Creator from GHOS</h1>
      <p className="mt-3 text-slate-300">
        This Ticket Creator installation uses your GHOS account. Sign in to GHOS and open Ticketing from its navigation.
      </p>
    </div>
  </div>
);

export const GhosSsoBridge = () => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isGhosEmbedded()) return;

    let parentOrigin: string | null = null;
    try {
      if (document.referrer) {
        parentOrigin = new URL(document.referrer).origin;
      }
    } catch {
      parentOrigin = null;
    }

    if (!parentOrigin && window.location.ancestorOrigins?.length) {
      try {
        parentOrigin = new URL(window.location.ancestorOrigins[0]).origin;
      } catch {
        parentOrigin = null;
      }
    }

    let processing = false;

    const finishSso = async (tokenHash: string, replyOrigin?: string) => {
      if (processing) return;
      if (tokenHash.length < 20 || tokenHash.length > 1024) {
        setError("GHOS supplied an invalid Ticket Creator session.");
        return;
      }

      processing = true;
      setError(null);
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });
      if (verifyError) {
        processing = false;
        setError("Your Ticket Creator session could not be started. Refresh the GHOS Ticketing page to try again.");
        return;
      }

      if (window.location.hash.startsWith("#ghos-sso=")) {
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }

      if (parentOrigin || replyOrigin) {
        window.parent.postMessage(
          { type: "ghos:ticketing-sso-complete" },
          parentOrigin ?? replyOrigin!,
        );
      }
    };

    const handleMessage = async (event: MessageEvent) => {
      if (event.source !== window.parent ||
          (parentOrigin !== null && event.origin !== parentOrigin)) {
        return;
      }

      // Some installed-app and privacy modes omit the iframe referrer. Pin
      // the first parent origin that can present GHOS's one-time SSO token.
      if (parentOrigin === null && event.data?.type === "ghos:ticketing-sso") {
        parentOrigin = event.origin;
      }

      if (event.data?.type === "ghos:ticketing-context") {
        replaceEmbeddedPermissions(event.data.permissions);
        return;
      }

      if (event.data?.type !== "ghos:ticketing-sso") return;

      const tokenHash = typeof event.data.tokenHash === "string"
        ? event.data.tokenHash.trim()
        : "";
      await finishSso(tokenHash, event.origin);
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage(
      { type: "ghos:ticketing-sso-ready" },
      parentOrigin ?? "*",
    );

    const fragmentToken = new URLSearchParams(
      window.location.hash.slice(1),
    ).get("ghos-sso")?.trim();
    if (fragmentToken) {
      void finishSso(fragmentToken);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  if (!error) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0d1522] px-6 text-white">
      <div className="max-w-lg text-center">
        <h2 className="text-xl font-semibold">Single sign-on could not finish</h2>
        <p className="mt-3 text-slate-300">{error}</p>
        <Loader2 className="mx-auto mt-5 h-6 w-6 animate-spin text-slate-400" />
      </div>
    </div>
  );
};
