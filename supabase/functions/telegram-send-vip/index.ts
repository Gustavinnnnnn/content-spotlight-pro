import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { chat_id } = await req.json();
    if (!chat_id) {
      return new Response(JSON.stringify({ error: "chat_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("telegram_settings")
      .select("bot_token, vip_invite_link, vip_message")
      .limit(1)
      .maybeSingle();

    if (!settings?.bot_token || !settings?.vip_invite_link) {
      return new Response(JSON.stringify({ error: "telegram not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = `${settings.vip_message}\n\n${settings.vip_invite_link}`;

    const r = await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id,
        text,
        reply_markup: {
          inline_keyboard: [[{ text: "🔓 Entrar no VIP", url: settings.vip_invite_link }]],
        },
      }),
    });
    const data = await r.json();

    return new Response(JSON.stringify({ ok: data.ok, result: data }), {
      status: r.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("telegram-send-vip error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
