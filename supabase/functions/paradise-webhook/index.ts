import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    console.log("Paradise webhook:", JSON.stringify(body));

    const reference: string | undefined = body.external_id || body.reference;
    const status: string | undefined = body.status;
    const paradiseId: string | undefined = body.transaction_id ? String(body.transaction_id) : undefined;

    if (!reference || !status) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Locate transaction
    const { data: tx } = await supabase
      .from("transactions")
      .select("id, status, plan_id, telegram_chat_id")
      .eq("reference", reference)
      .maybeSingle();

    if (!tx) {
      console.warn("Transação não encontrada:", reference);
      // Still return 200 so Paradise doesn't retry forever
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("transactions")
      .update({
        status,
        paradise_transaction_id: paradiseId ?? undefined,
        raw_payload: body,
      })
      .eq("id", tx.id);

    // Track purchase event + send VIP via Telegram + push notifications
    if (status === "approved" && tx.status !== "approved") {
      await supabase.from("site_events").insert({
        event_type: "purchase",
        plan_id: tx.plan_id,
        metadata: { reference, amount: body.amount },
      });

      if (tx.telegram_chat_id) {
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-send-vip`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ chat_id: tx.telegram_chat_id }),
          });
        } catch (err) {
          console.error("Failed to send VIP message:", err);
        }
      }

      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sale-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            title: "Venda aprovada",
            body: `Pagamento aprovado${body.amount ? ` · R$ ${(Number(body.amount) / 100).toFixed(2).replace('.', ',')}` : ""}`,
            data: { reference, type: "sale-approved" },
          }),
        });
      } catch (err) {
        console.error("Failed to send sale push:", err);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paradise-webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
