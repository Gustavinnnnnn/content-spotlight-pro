// telegram-send-message: envia texto OU mídia (photo/video/voice/audio) do admin para um chat.
// Também persiste em telegram_messages com direction='out'.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MEDIA_METHOD: Record<string, { method: string; field: string }> = {
  photo: { method: "sendPhoto", field: "photo" },
  video: { method: "sendVideo", field: "video" },
  voice: { method: "sendVoice", field: "voice" },
  audio: { method: "sendAudio", field: "audio" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, service);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const chat_id = Number(body?.chat_id);
    const text = String(body?.text ?? "").trim();
    const mediaUrl = body?.media_url ? String(body.media_url) : null;
    const mediaType = body?.media_type ? String(body.media_type) : null;

    if (!chat_id) {
      return new Response(JSON.stringify({ error: "chat_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!text && !mediaUrl) {
      return new Response(JSON.stringify({ error: "text or media required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > 4000) {
      return new Response(JSON.stringify({ error: "text too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await admin
      .from("telegram_settings")
      .select("bot_token")
      .limit(1)
      .maybeSingle();

    if (!settings?.bot_token) {
      return new Response(JSON.stringify({ error: "bot not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let r: Response;
    if (mediaUrl && mediaType && MEDIA_METHOD[mediaType]) {
      const cfg = MEDIA_METHOD[mediaType];
      const payload: Record<string, unknown> = {
        chat_id,
        [cfg.field]: mediaUrl,
      };
      if (text) payload.caption = text;
      r = await fetch(`https://api.telegram.org/bot${settings.bot_token}/${cfg.method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      r = await fetch(`https://api.telegram.org/bot${settings.bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id, text }),
      });
    }

    const data = await r.json();
    if (!data.ok) {
      return new Response(JSON.stringify({ error: data.description || "telegram error", result: data }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const synthetic = -Math.floor(Date.now() + Math.random() * 1000);
    await admin.from("telegram_messages").insert({
      update_id: synthetic,
      chat_id,
      username: null,
      first_name: "Admin",
      text: text || null,
      media_url: mediaUrl,
      media_type: mediaType,
      media_caption: mediaUrl && text ? text : null,
      direction: "out",
      raw_update: { admin_sent: true, message_id: data.result?.message_id ?? null },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("telegram-send-message error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
