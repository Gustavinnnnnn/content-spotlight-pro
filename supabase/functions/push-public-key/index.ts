const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const publicKey = Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY");

  if (!publicKey) {
    return new Response(JSON.stringify({ error: "Chave pública não configurada" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ publicKey }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});