import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Lead {
  id: string;
  category: string | null;
  urgency: string | null;
  public_summary: string | null;
  estimated_damage: number | null;
  city: string | null;
  price_rub: number;
  status: string;
  created_at: string;
}

export const useLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setLeads((data ?? []) as Lead[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const purchase = useCallback(async (leadId: string) => {
    const { data, error } = await supabase.functions.invoke("purchase-lead", {
      body: { leadId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await load();
    return data as { ok: boolean; contact: string | null; price_rub: number };
  }, [load]);

  return { leads, loading, error, reload: load, purchase };
};
