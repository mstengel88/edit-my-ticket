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

      // Fetch products from Loadrite API
      try {
        const apiProducts = await getProducts();
        const names = apiProducts
          .map((p: LoadriteProduct) => p.Name || p.Description)
          .filter(Boolean);
        setProducts([...new Set(names)].sort());
      } catch (err) {
        console.error("Failed to fetch products from API:", err);
        // Fallback: derive from tickets
        const { data } = await supabase
          .from("tickets")
          .select("product");
        if (data) {
          const unique = [...new Set(data.map((r) => r.product).filter((p) => p && p.trim()))];
          setProducts(unique.sort());
        }
      }

      // Derive customers and trucks from existing tickets
      const { data: tickets } = await supabase
        .from("tickets")
        .select("customer, truck");

      if (tickets) {
        const uniqueCustomers = [
          ...new Set(
            tickets
              .map((t) => t.customer)
              .filter((c) => c && c.trim() && c !== "NOT SPECIFIED")
          ),
        ].sort();
        setCustomers(uniqueCustomers);

        const uniqueTrucks = [
          ...new Set(
            tickets
              .map((t) => t.truck)
              .filter((t) => t && t.trim() && t !== "-" && t !== "NOT SPECIFIED")
          ),
        ].sort();
        setTrucks(uniqueTrucks);
      }

      setLoading(false);
    }

    load();
  }, []);

  return { products, customers, trucks, loading };
}
