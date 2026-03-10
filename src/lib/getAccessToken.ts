import { supabase } from "@/integrations/supabase/client";

export async function getAccessToken(): Promise<string> {
  // Force Supabase to resolve the current user first
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    throw new Error("Not signed in");
  }

  let { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  let session = data.session;

  // Refresh if missing or close to expiry
  const expiresSoon =
    !session?.expires_at || session.expires_at * 1000 < Date.now() + 60_000;

  if (!session || expiresSoon) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session?.access_token) {
      throw refreshed.error || new Error("Unable to refresh session");
    }
    session = refreshed.data.session;
  }

  if (!session.access_token) {
    throw new Error("No access token");
  }

  return session.access_token;
}