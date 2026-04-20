import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, MessageCircle, CheckCircle2, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Customer {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  plan_name: string | null;
  amount: number;
  status: string;
  created_at: string;
}

const formatBRL = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
const formatPhone = (p: string | null) => {
  if (!p) return "—";
  const d = p.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p;
};

const CustomerList = ({ rows, emptyText, accent }: { rows: Customer[]; emptyText: string; accent: "paid" | "pending" }) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  const badge = accent === "paid"
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : "bg-amber-500/15 text-amber-300 border-amber-500/30";
  const label = accent === "paid" ? "Pago" : "Pendente";

  return (
    <ul className="space-y-2">
      {rows.map((c) => {
        const digits = (c.customer_phone || "").replace(/\D/g, "");
        const wa = digits ? `https://wa.me/${digits.length <= 11 ? "55" + digits : digits}` : null;
        return (
          <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-gradient-admin-card p-3 shadow-admin transition-smooth hover:border-primary/30">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-admin-accent text-sm font-extrabold uppercase text-white shadow-admin-glow">
              {(c.customer_name || "?").charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold">{c.customer_name || "Sem nome"}</span>
                <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge}`}>{label}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {formatPhone(c.customer_phone)}</span>
                <span className="hidden sm:inline">· {c.plan_name || "—"}</span>
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-sm font-extrabold tabular-nums">{formatBRL(c.amount)}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {new Date(c.created_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
            {wa && (
              <Button asChild size="icon" className="h-9 w-9 shrink-0 rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" aria-label="Abrir WhatsApp">
                <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /></a>
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export const CustomersEditor = () => {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id,customer_name,customer_phone,plan_name,amount,status,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (data) setRows(data as Customer[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("customers-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando clientes...</div>;
  }

  const filter = (r: Customer) => {
    if (!q) return true;
    const t = q.toLowerCase();
    return (r.customer_name || "").toLowerCase().includes(t) || (r.customer_phone || "").includes(t);
  };

  const paid = rows.filter((r) => r.status === "approved").filter(filter);
  const pending = rows.filter((r) => r.status === "pending" || r.status === "processing" || r.status === "under_review").filter(filter);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-gradient-admin-card p-4 shadow-admin">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold tracking-tight">{paid.length}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Clientes pagos</div>
        </div>
        <div className="rounded-2xl border border-border bg-gradient-admin-card p-4 shadow-admin">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-3 text-2xl font-extrabold tracking-tight">{pending.length}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Pendentes</div>
        </div>
      </div>

      <Input
        placeholder="Buscar por nome ou telefone..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="bg-card/50"
      />

      <Tabs defaultValue="paid" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-card/50 p-1">
          <TabsTrigger value="paid" className="data-[state=active]:bg-gradient-admin-accent data-[state=active]:text-white">
            Pagos ({paid.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-gradient-admin-accent data-[state=active]:text-white">
            Pendentes ({pending.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="paid" className="mt-4">
          <CustomerList rows={paid} emptyText="Nenhum cliente pagou ainda." accent="paid" />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <CustomerList rows={pending} emptyText="Nenhum cliente pendente." accent="pending" />
        </TabsContent>
      </Tabs>
    </div>
  );
};
