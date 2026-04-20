import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

async function tg(token: string, method: string, body: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Load settings
  const { data: settings } = await supabase
    .from("telegram_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!settings || !settings.active || !settings.bot_token) {
    return new Response(JSON.stringify({ ok: true, skipped: "bot inactive or no token" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = settings.bot_token as string;
  const welcome = settings.welcome_message as string;
  const buttonText = settings.button_text as string;
  const webappUrl = settings.webapp_url as string | null;

  // Read offset
  const { data: state } = await supabase
    .from("telegram_bot_state")
    .select("update_offset")
    .eq("id", 1)
    .single();
  let currentOffset = state?.update_offset ?? 0;
  let totalProcessed = 0;

  while (true) {
    const remaining = MAX_RUNTIME_MS - (Date.now() - startTime);
    if (remaining < MIN_REMAINING_MS) break;
    const timeout = Math.min(50, Math.floor(remaining / 1000) - 5);
    if (timeout < 1) break;

    const data = await tg(token, "getUpdates", {
      offset: currentOffset,
      timeout,
      allowed_updates: ["message"],
    });

    if (!data.ok) {
      console.error("getUpdates failed:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    const rows = updates
      .filter((u: any) => u.message)
      .map((u: any) => ({
        update_id: u.update_id,
        chat_id: u.message.chat.id,
        username: u.message.from?.username ?? null,
        first_name: u.message.from?.first_name ?? null,
        text: u.message.text ?? null,
        raw_update: u,
      }));

    if (rows.length > 0) {
      await supabase.from("telegram_messages").upsert(rows, { onConflict: "update_id" });
      totalProcessed += rows.length;

      // Respond to /start
      for (const row of rows) {
        if (row.text && row.text.trim().startsWith("/start")) {
          const keyboard = webappUrl
            ? { inline_keyboard: [[{ text: buttonText, web_app: { url: webappUrl } }]] }
            : { inline_keyboard: [[{ text: buttonText, url: webappUrl || "https://t.me" }]] };
          await tg(token, "sendMessage", {
            chat_id: row.chat_id,
            text: welcome,
            reply_markup: keyboard,
          });
        }
      }
    }

    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase
      .from("telegram_bot_state")
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq("id", 1);
    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed, offset: currentOffset }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
