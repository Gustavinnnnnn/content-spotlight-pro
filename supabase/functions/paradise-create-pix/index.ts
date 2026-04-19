import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PARADISE_URL = "https://multi.paradisepags.com/api/v1/transaction.php";

interface Body {
  planId: string;
  customer: { name: string; email: string; document: string; phone: string };
}

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PARADISE_API_KEY = Deno.env.get("PARADISE_API_KEY");
    if (!PARADISE_API_KEY) throw new Error("PARADISE_API_KEY não configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as Body;

    // Basic validation
    if (!body.planId || !body.customer) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const c = body.customer;
    const name = (c.name || "").trim();
    const email = (c.email || "").trim();
    const document = onlyDigits(c.document);
    const phone = onlyDigits(c.phone);

    if (name.length < 2 || name.length > 120) {
      return new Response(JSON.stringify({ error: "Nome inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (document.length !== 11 && document.length !== 14) {
      return new Response(JSON.stringify({ error: "CPF/CNPJ inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (phone.length < 10 || phone.length > 13) {
      return new Response(JSON.stringify({ error: "Telefone inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch plan
    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("id, name, price_label, active")
      .eq("id", body.planId)
      .maybeSingle();

    if (planErr || !plan || !plan.active) {
      return new Response(JSON.stringify({ error: "Plano não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse price_label (e.g., "R$ 19,90" → 1990)
    const priceMatch = (plan.price_label || "").replace(/\./g, "").match(/(\d+)[,]?(\d{0,2})/);
    if (!priceMatch) {
      return new Response(JSON.stringify({ error: "Preço do plano inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const reais = parseInt(priceMatch[1], 10);
    const cents = priceMatch[2] ? parseInt(priceMatch[2].padEnd(2, "0"), 10) : 0;
    const amount = reais * 100 + cents;

    if (amount < 100) {
      return new Response(JSON.stringify({ error: "Valor mínimo de R$ 1,00" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = `${plan.id.slice(0, 8)}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // Build webhook URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
    const postback_url = `https://${projectRef}.supabase.co/functions/v1/paradise-webhook`;

    const payload = {
      amount,
      description: plan.name,
      reference,
      source: "api_externa",
      postback_url,
      customer: { name, email, document, phone },
    };

    const resp = await fetch(PARADISE_URL, {
      method: "POST",
      headers: {
        "X-API-Key": PARADISE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok || data.status !== "success") {
      console.error("Paradise error:", resp.status, data);
      return new Response(JSON.stringify({ error: data.message || "Falha ao gerar PIX", details: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist transaction
    const { error: insErr } = await supabase.from("transactions").insert({
      reference,
      paradise_transaction_id: String(data.transaction_id),
      plan_id: plan.id,
      plan_name: plan.name,
      amount,
      status: "pending",
      customer_name: name,
      customer_email: email,
      customer_document: document,
      customer_phone: phone,
      qr_code: data.qr_code,
      qr_code_base64: data.qr_code_base64,
      expires_at: data.expires_at ? new Date(data.expires_at.replace(" ", "T")).toISOString() : null,
      raw_payload: data,
    });

    if (insErr) console.error("Insert error:", insErr);

    return new Response(
      JSON.stringify({
        reference,
        transaction_id: data.transaction_id,
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
        amount,
        expires_at: data.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("paradise-create-pix error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
