import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PARADISE_URL = "https://multi.paradisepags.com/api/v1/query.php";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PARADISE_API_KEY = Deno.env.get("PARADISE_API_KEY");
    if (!PARADISE_API_KEY) throw new Error("PARADISE_API_KEY não configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { reference } = await req.json();
    if (!reference || typeof reference !== "string") {
      return new Response(JSON.stringify({ error: "reference obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tx } = await supabase
      .from("transactions")
      .select("id, status, paradise_transaction_id, plan_id")
      .eq("reference", reference)
      .maybeSingle();

    if (!tx) {
      return new Response(JSON.stringify({ error: "Transação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If still pending, check Paradise
    if (tx.status === "pending" && tx.paradise_transaction_id) {
      const url = `${PARADISE_URL}?action=get_transaction&id=${tx.paradise_transaction_id}`;
      const resp = await fetch(url, { headers: { "X-API-Key": PARADISE_API_KEY } });
      if (resp.ok) {
        const data = await resp.json();
        if (data.status && data.status !== tx.status) {
          await supabase.from("transactions").update({ status: data.status, raw_payload: data }).eq("id", tx.id);
          if (data.status === "approved") {
            await supabase.from("site_events").insert({
              event_type: "purchase",
              plan_id: tx.plan_id,
              metadata: { reference },
            });
          }
          return new Response(JSON.stringify({ status: data.status }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response(JSON.stringify({ status: tx.status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paradise-check-status error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
