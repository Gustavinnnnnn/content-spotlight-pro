// paradise-webhook: recebe callbacks da Paradise para transactions E transaction_fees.
// Fluxo:
//   1) transaction principal aprovada -> cria transaction_fees pendentes (se houver post_purchase_fees ativas)
//                                       -> gera PIX da 1ª taxa e envia pelo Telegram
//                                       -> se não houver taxas ativas, envia link VIP direto
//   2) transaction_fee aprovada       -> marca paga, gera PIX da próxima OU envia link VIP se foi a última

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PARADISE_URL = "https://multi.paradisepags.com/api/v1/transaction.php";

async function tg(token: string, method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await r.json();
}

async function createFeePix(params: {
  fee: any;
  tx: any;
  supabase: any;
  apiKey: string;
  postbackUrl: string;
}) {
  const { fee, tx, supabase, apiKey, postbackUrl } = params;
  const reference = `fee-${String(fee.id).slice(0, 8)}-${Date.now()}`;

  const payload = {
    amount: fee.amount,
    description: fee.fee_name,
    reference,
    source: "api_externa",
    postback_url: postbackUrl,
    customer: {
      name: tx.customer_name || "Cliente",
      email: tx.customer_email || "cliente@cliente.local",
      document: tx.customer_document || "00000000000",
      phone: tx.customer_phone || "11999999999",
    },
  };

  const resp = await fetch(PARADISE_URL, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok || data.status !== "success") {
    console.error("Fee PIX creation failed:", data);
    return null;
  }

  await supabase.from("transaction_fees").update({
    reference,
    paradise_transaction_id: String(data.transaction_id),
    qr_code: data.qr_code,
    qr_code_base64: data.qr_code_base64,
    expires_at: data.expires_at ? new Date(data.expires_at.replace(" ", "T")).toISOString() : null,
    raw_payload: data,
  }).eq("id", fee.id);

  return data;
}

async function sendFeeToTelegram(params: {
  fee: any;
  pixData: any;
  chatId: number;
  botToken: string;
}) {
  const { fee, pixData, chatId, botToken } = params;
  const amountLabel = `R$ ${(fee.amount / 100).toFixed(2).replace(".", ",")}`;
  const text = `💳 <b>Próxima etapa: ${fee.fee_name}</b>\n\n${fee.fee_description || ""}\n\n<b>Valor:</b> ${amountLabel}\n\nEscaneie o QR ou copie o código PIX abaixo:`;

  // Send caption + QR image
  if (pixData.qr_code_base64) {
    try {
      const b64 = pixData.qr_code_base64.replace(/^data:image\/\w+;base64,/, "");
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const form = new FormData();
      form.append("chat_id", String(chatId));
      form.append("caption", text);
      form.append("parse_mode", "HTML");
      form.append("photo", new Blob([bin], { type: "image/png" }), "pix.png");
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: "POST", body: form });
    } catch (e) {
      console.error("sendPhoto failed, fallback to text:", e);
      await tg(botToken, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
    }
  } else {
    await tg(botToken, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
  }

  // Send copy-paste code separately as monospace for easy copy
  await tg(botToken, "sendMessage", {
    chat_id: chatId,
    text: `<code>${pixData.qr_code}</code>\n\n👆 Toque para copiar o código PIX`,
    parse_mode: "HTML",
  });
}

async function sendVip(supabase: any, chatId: number) {
  await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-send-vip`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ chat_id: chatId }),
  }).catch((e) => console.error("send-vip failed:", e));
}

async function advanceFeesFlow(supabase: any, tx: any, botToken: string, apiKey: string, postbackUrl: string) {
  if (!tx.telegram_chat_id) {
    console.log("No telegram_chat_id, skipping fee flow");
    return;
  }

  // Find next pending fee for this transaction
  const { data: nextFee } = await supabase
    .from("transaction_fees")
    .select("*")
    .eq("transaction_id", tx.id)
    .eq("status", "pending")
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  if (!nextFee) {
    console.log("No more pending fees, sending VIP");
    await sendVip(supabase, tx.telegram_chat_id);
    return;
  }

  const pix = await createFeePix({ fee: nextFee, tx, supabase, apiKey, postbackUrl });
  if (!pix) {
    console.error("Failed to generate fee PIX");
    return;
  }
  await sendFeeToTelegram({ fee: nextFee, pixData: pix, chatId: tx.telegram_chat_id, botToken });
}

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

    const isFeeRef = reference.startsWith("fee-");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
    const postbackUrl = `https://${projectRef}.supabase.co/functions/v1/paradise-webhook`;

    const { data: settings } = await supabase
      .from("telegram_settings")
      .select("bot_token")
      .limit(1)
      .maybeSingle();
    const botToken = settings?.bot_token as string | undefined;
    const paradiseKey = Deno.env.get("PARADISE_API_KEY")!;

    // ==================== FEE PAYMENT ====================
    if (isFeeRef) {
      const { data: fee } = await supabase
        .from("transaction_fees")
        .select("*")
        .eq("reference", reference)
        .maybeSingle();

      if (!fee) {
        console.warn("Fee not found for reference:", reference);
        return new Response(JSON.stringify({ received: true, ignored: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const wasApproved = fee.status === "approved";
      await supabase.from("transaction_fees").update({
        status,
        paradise_transaction_id: paradiseId ?? undefined,
        raw_payload: body,
        paid_at: status === "approved" ? new Date().toISOString() : fee.paid_at,
      }).eq("id", fee.id);

      if (status === "approved" && !wasApproved && botToken) {
        // Load transaction and advance
        const { data: tx } = await supabase
          .from("transactions")
          .select("*")
          .eq("id", fee.transaction_id)
          .maybeSingle();

        if (tx) {
          await advanceFeesFlow(supabase, tx, botToken, paradiseKey, postbackUrl);
        }

        // Push notification for fee paid
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-sale-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              title: `Taxa paga: ${fee.fee_name}`,
              body: `+R$ ${(fee.amount / 100).toFixed(2).replace(".", ",")}`,
              data: { reference, type: "fee-paid" },
            }),
          });
        } catch (err) { console.error("push failed:", err); }
      }

      return new Response(JSON.stringify({ received: true, kind: "fee" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== MAIN TRANSACTION ====================
    const { data: tx } = await supabase
      .from("transactions")
      .select("*")
      .eq("reference", reference)
      .maybeSingle();

    if (!tx) {
      console.warn("Transação não encontrada:", reference);
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wasApproved = tx.status === "approved";
    await supabase.from("transactions").update({
      status,
      paradise_transaction_id: paradiseId ?? undefined,
      raw_payload: body,
      paid_at: status === "approved" ? new Date().toISOString() : tx.paid_at,
    }).eq("id", tx.id);

    if (status === "approved" && !wasApproved) {
      await supabase.from("site_events").insert({
        event_type: "purchase",
        plan_id: tx.plan_id,
        metadata: { reference, amount: body.amount },
      });

      // Create transaction_fees rows from active post_purchase_fees
      const { data: fees } = await supabase
        .from("post_purchase_fees")
        .select("*")
        .eq("active", true)
        .order("sort_order");

      const activeFees = (fees ?? []) as any[];
      if (activeFees.length > 0) {
        const rows = activeFees.map((f) => ({
          transaction_id: tx.id,
          fee_id: f.id,
          fee_name: f.name,
          fee_description: f.description,
          amount: f.amount,
          sort_order: f.sort_order,
          status: "pending",
          reference: `fee-pending-${tx.id.slice(0, 8)}-${f.id.slice(0, 8)}`, // placeholder until PIX created
        }));
        await supabase.from("transaction_fees").insert(rows);
      }

      // Advance flow: send first fee OR send VIP
      if (botToken) {
        // reload tx with telegram_chat_id
        await advanceFeesFlow(supabase, tx, botToken, paradiseKey, postbackUrl);
      }

      // Push
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-sale-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            title: "Venda aprovada",
            body: `Pagamento aprovado${body.amount ? ` · R$ ${(Number(body.amount) / 100).toFixed(2).replace(".", ",")}` : ""}`,
            data: { reference, type: "sale-approved" },
          }),
        });
      } catch (err) { console.error("push failed:", err); }
    }

    return new Response(JSON.stringify({ received: true, kind: "transaction" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paradise-webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
