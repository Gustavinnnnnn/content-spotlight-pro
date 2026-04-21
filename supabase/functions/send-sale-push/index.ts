import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const VAPID_PUBLIC_KEY = Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error("Push não configurado completamente");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const payload = await req.json();

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, subscription");

    if (error) throw error;

    const webpush = await import("npm:web-push@3.6.7");

    webpush.setVapidDetails(
      "mailto:notificacoes@lovable.app",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    );

    const results = await Promise.allSettled(
      (subscriptions || []).map(async (item) => {
        try {
          await webpush.sendNotification(item.subscription as webpush.PushSubscription, JSON.stringify(payload));
          return { id: item.id, ok: true };
        } catch (pushError: any) {
          const statusCode = pushError?.statusCode ?? 500;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", item.id);
          }
          throw pushError;
        }
      })
    );

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("send-sale-push error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});