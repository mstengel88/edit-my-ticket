import { useState, useEffect } from "react";
import { getProducts, LoadriteProduct } from "@/services/loadrite";
import { supabase } from "@/integrations/supabase/client";

interface LookupData {
  products: string[];
  customers: string[];
  trucks: string[];
  loading: boolean;
}

export function useTicketLookups(): LookupData {
  const [products, setProducts] = useState<string[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [trucks, setTrucks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      // Sync products from Loadrite API into the products table
      try {
        const apiProducts = await getProducts();
        const names = apiProducts
          .map((p: LoadriteProduct) => p.Name || p.Description)
          .filter(Boolean);
        const uniqueNames = [...new Set(names)] as string[];

        // Upsert each product (ignore conflicts on unique name)
        for (const name of uniqueNames) {
          await supabase
            .from("products")
            .upsert({ name, user_id: userId, source: "loadrite" }, { onConflict: "name" })
            .select();
        }
      } catch (err) {
        console.error("Failed to sync products from API:", err);
      }

      // Also seed customers/trucks from existing tickets if tables are empty
      const [
        { data: existingCustomers },
        { data: existingTrucks },
      ] = await Promise.all([
        supabase.from("customers").select("name"),
        supabase.from("trucks").select("name"),
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
            for (const name of uniqueCustomerNames) {
              await supabase
                .from("customers")
                .upsert({ name, user_id: userId }, { onConflict: "name,user_id" })
                .select();
            }
          }

          if (!existingTrucks?.length) {
            const uniqueTruckNames = [
              ...new Set(
                tickets
                  .map((t) => t.truck)
                  .filter((t) => t && t.trim() && t !== "-" && t !== "NOT SPECIFIED")
              ),
            ];
            for (const name of uniqueTruckNames) {
              await supabase
                .from("trucks")
                .upsert({ name, user_id: userId }, { onConflict: "name,user_id" })
                .select();
            }
          }
        }
      }

      // Now read from the lookup tables
      const [
        { data: productRows },
        { data: customerRows },
        { data: truckRows },
      ] = await Promise.all([
        supabase.from("products").select("name").order("name"),
        supabase.from("customers").select("name").order("name"),
        supabase.from("trucks").select("name").order("name"),
      ]);

      setProducts((productRows || []).map((r) => r.name));
      setCustomers((customerRows || []).map((r) => r.name));
      setTrucks((truckRows || []).map((r) => r.name));

      setLoading(false);
    }

    load();
  }, []);

  return { products, customers, trucks, loading };
}
