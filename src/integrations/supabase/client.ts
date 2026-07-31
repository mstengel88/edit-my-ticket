import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function requireRuntimeConfig(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(
      `${name} is required. Configure it in the deployment environment before starting Ticket Printer.`,
    );
  }

  return normalized;
}

export const SUPABASE_URL = requireRuntimeConfig(
  "VITE_SUPABASE_URL",
  import.meta.env.VITE_SUPABASE_URL,
);
export const SUPABASE_PUBLISHABLE_KEY = requireRuntimeConfig(
  "VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
