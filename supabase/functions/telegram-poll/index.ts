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

// Detects incoming media, downloads via Telegram, uploads to Supabase storage, returns { url, type }.
async function extractAndStoreMedia(
  supabase: any,
  token: string,
  message: any,
): Promise<{ url: string | null; type: string | null; caption: string | null }> {
  let file_id: string | null = null;
  let type: string | null = null;
  const caption = message.caption ?? null;

  if (message.photo && Array.isArray(message.photo) && message.photo.length) {
    // largest photo
    file_id = message.photo[message.photo.length - 1].file_id;
    type = "photo";
  } else if (message.voice) {
    file_id = message.voice.file_id;
    type = "voice";
  } else if (message.audio) {
    file_id = message.audio.file_id;
    type = "audio";
  } else if (message.video) {
    file_id = message.video.file_id;
    type = "video";
  } else if (message.video_note) {
    file_id = message.video_note.file_id;
    type = "video";
  } else if (message.document) {
    file_id = message.document.file_id;
    type = "document";
  }

  if (!file_id || !type) return { url: null, type: null, caption };

  try {
    const info = await tg(token, "getFile", { file_id });
    if (!info.ok) return { url: null, type: null, caption };
    const filePath = info.result.file_path as string;
    const dl = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    if (!dl.ok) return { url: null, type: null, caption };
    const bytes = new Uint8Array(await dl.arrayBuffer());

    const ext = filePath.split(".").pop() || "bin";
    const contentType =
      type === "photo" ? "image/jpeg" :
      type === "voice" ? "audio/ogg" :
      type === "audio" ? "audio/mpeg" :
      type === "video" ? "video/mp4" :
      "application/octet-stream";

    const objectPath = `chat-media/in-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("club-assets").upload(objectPath, bytes, {
      contentType,
      upsert: false,
    });
    if (upErr) {
      console.error("chat media upload error:", upErr);
      return { url: null, type: null, caption };
    }
    const { data: pub } = supabase.storage.from("club-assets").getPublicUrl(objectPath);
    return { url: pub?.publicUrl ?? null, type, caption };
  } catch (e) {
    console.error("extractAndStoreMedia error:", e);
    return { url: null, type: null, caption };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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
  const welcomeMediaUrl = settings.welcome_media_url as string | null;
  const welcomeMediaType = settings.welcome_media_type as string | null;

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

    // Build rows (with media extraction, sequentially to avoid rate limits)
    const rows: any[] = [];
    for (const u of updates) {
      if (!u.message) continue;
      const media = await extractAndStoreMedia(supabase, token, u.message);
      rows.push({
        update_id: u.update_id,
        chat_id: u.message.chat.id,
        username: u.message.from?.username ?? null,
        first_name: u.message.from?.first_name ?? null,
        text: u.message.text ?? u.message.caption ?? null,
        media_url: media.url,
        media_type: media.type,
        media_caption: media.caption,
        raw_update: u,
      });
    }

    if (rows.length > 0) {
      await supabase.from("telegram_messages").upsert(rows, { onConflict: "update_id" });
      totalProcessed += rows.length;

      for (const row of rows) {
        if (row.text && String(row.text).trim().startsWith("/start")) {
          const keyboard = webappUrl
            ? { inline_keyboard: [[{ text: buttonText, web_app: { url: webappUrl } }]] }
            : { inline_keyboard: [[{ text: buttonText, url: webappUrl || "https://t.me" }]] };

          if (welcomeMediaUrl && welcomeMediaType === "photo") {
            await tg(token, "sendPhoto", { chat_id: row.chat_id, photo: welcomeMediaUrl, caption: welcome, reply_markup: keyboard });
          } else if (welcomeMediaUrl && welcomeMediaType === "video") {
            await tg(token, "sendVideo", { chat_id: row.chat_id, video: welcomeMediaUrl, caption: welcome, reply_markup: keyboard, supports_streaming: true });
          } else {
            await tg(token, "sendMessage", { chat_id: row.chat_id, text: welcome, reply_markup: keyboard });
          }
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
