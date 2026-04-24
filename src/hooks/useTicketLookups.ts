import { useState, useEffect } from "react";
import { getProducts, LoadriteProduct } from "@/services/loadrite";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { buildTruckRecord, isStandardTruckName, normalizeTruckName } from "@/lib/truckName";

interface LookupData {
  products: string[];
  customers: string[];
  customerEmails: Record<string, string>;
  trucks: string[];
  loading: boolean;
}

const CACHE_KEY = "ticket-lookups-cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedLookups {
  products: string[];
  customers: string[];
  customerEmails: Record<string, string>;
  trucks: string[];
  timestamp: number;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean).map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function readCache(): CachedLookups | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedLookups = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function writeCache(data: Omit<CachedLookups, "timestamp">) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
  } catch {
    // localStorage full or unavailable
  }
}

const initialCache = readCache();

export function useTicketLookups(): LookupData {
  const { session, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<string[]>(initialCache?.products ?? []);
  const [customers, setCustomers] = useState<string[]>(initialCache?.customers ?? []);
  const [customerEmails, setCustomerEmails] = useState<Record<string, string>>(initialCache?.customerEmails ?? {});
  const [trucks, setTrucks] = useState<string[]>(initialCache?.trucks ?? []);
  const [loading, setLoading] = useState(!initialCache);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    const userId = session?.user?.id;

    if (!userId) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    async function loadFromDb(extraProducts: string[] = []) {
      if (!initialCache) {
        setLoading(true);
      }

      // Step 1: Load from DB immediately (fast)
      const [
        { data: productRows },
        { data: customerRows },
        { data: truckRows },
      ] = await Promise.all([
        supabase.from("products").select("name").order("name"),
        supabase.from("customers").select("name, email").order("name"),
        supabase.from("trucks").select("name").order("name"),
      ]);

      if (cancelled) return;

      const prods = uniqueSorted([...(productRows || []).map((r) => r.name), ...extraProducts]);
      const custs = (customerRows || []).map((r) => r.name);
      const emailMap: Record<string, string> = {};
      (customerRows || []).forEach((r) => { if (r.email) emailMap[r.name] = r.email; });
      const trks = uniqueSorted((truckRows || []).map((r) => normalizeTruckName(r.name)));

      setProducts(prods);
      setCustomers(custs);
      setCustomerEmails(emailMap);
      setTrucks(trks);
      setLoading(false);

      // Cache the fresh DB data
      writeCache({ products: prods, customers: custs, customerEmails: emailMap, trucks: trks });

      return { prods, custs, trks };
    }

    async function syncInBackground() {
      // Sync products from Loadrite API (non-blocking)
      let apiProductNames: string[] = [];
      try {
        const apiProducts = await getProducts();
         const names = apiProducts
          .map((p: LoadriteProduct) => p.Name || p.Description)
          .filter(Boolean);
         apiProductNames = uniqueSorted(names as string[]);

         if (apiProductNames.length > 0) {
           setProducts((current) => uniqueSorted([...current, ...apiProductNames]));

           const rows = apiProductNames.map((name) => ({ name, user_id: userId, source: "loadrite" }));
          await supabase
            .from("products")
            .upsert(rows, { onConflict: "name" });
        }
      } catch (err) {
        console.error("Failed to sync products from API:", err);
      }

      // Seed customers/trucks from tickets if tables are empty
      const [
        { data: existingCustomers },
        { data: existingTrucks },
      ] = await Promise.all([
        supabase.from("customers").select("name").limit(1),
        supabase.from("trucks").select("name").limit(1),
      ]);

      if (!existingCustomers?.length || !existingTrucks?.length) {
        const { data: tickets } = await supabase
          .from("tickets")
          .select("customer, truck");

        if (tickets) {
          if (!existingCustomers?.length) {
            const uniqueCustomerNames = [
              ...new Set(
                tickets
                  .map((t) => t.customer)
                  .filter((c) => c && c.trim() && c !== "NOT SPECIFIED")
              ),
            ];
            const custRows = uniqueCustomerNames.map((name) => ({ name, user_id: userId }));
            if (custRows.length > 0) {
              await supabase.from("customers").upsert(custRows, { onConflict: "name" });
            }
          }

          if (!existingTrucks?.length) {
            const uniqueTruckNames = [
              ...new Set(
                tickets
                  .map((t) => normalizeTruckName(t.truck))
                  .filter((t) => t && t !== "-" && t !== "NOT SPECIFIED" && isStandardTruckName(t))
              ),
            ];
            const truckRows = uniqueTruckNames.map((name) => ({ ...buildTruckRecord(name), user_id: userId }));
            if (truckRows.length > 0) {
              await supabase.from("trucks").upsert(truckRows, { onConflict: "normalized_name" });
            }
          }
        }
      }

      // Refresh from DB after sync to pick up any new data
      if (!cancelled) {
        await loadFromDb(apiProductNames);
      }
    }

    // Load DB data first, then sync in background
    loadFromDb().then(() => {
      syncInBackground();
    });

    return () => { cancelled = true; };
  }, [authLoading, session?.user?.id]);

  return { products, customers, customerEmails, trucks, loading };
}
