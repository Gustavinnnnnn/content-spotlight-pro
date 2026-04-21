import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, CheckCircle2, Clock, DollarSign, Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { browserNotificationPermission, browserNotificationsSupported, requestBrowserNotificationPermission, showBrowserNotification } from "@/lib/browser-notifications";

interface Tx {
  id: string;
  reference: string;
  plan_name: string | null;
  amount: number;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  created_at: string;
}

const formatBRL = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

const statusStyle = (s: string) => {
  if (s === "approved") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (s === "pending" || s === "processing" || s === "under_review") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (s === "failed" || s === "refunded" || s === "chargeback") return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  return "bg-muted text-muted-foreground border-border";
};

const statusLabel: Record<string, string> = {
  approved: "Aprovado",
  pending: "Aguardando",
  processing: "Processando",
  under_review: "Em análise",
  failed: "Falhou",
  refunded: "Reembolsado",
  chargeback: "Chargeback",
};

export const SalesEditor = () => {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  const subscribePush = async () => {
    if (!browserNotificationsSupported()) {
      toast.error("Notificação do navegador não é suportada neste aparelho");
      return;
    }

    setSubscribing(true);
    try {
      const permission = await requestBrowserNotificationPermission();
      if (permission !== "granted") {
        toast.error("Permissão de notificação negada no Chrome");
        return;
      }
      toast.success("Notificações do Chrome ativadas neste navegador");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao ativar notificação");
    } finally {
      setSubscribing(false);
    }
  };

  const sendTestPush = async () => {
    setTestingPush(true);
    const permission = browserNotificationPermission();
    setTestingPush(false);
    if (permission !== "granted") {
      toast.error("Ative a permissão primeiro");
      return;
    }

    showBrowserNotification({
      title: "Venda aprovada",
      body: "Teste manual de notificação no Chrome.",
      url: "/admin",
    });
    toast.success("Notificação de teste enviada");
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id,reference,plan_name,amount,status,customer_name,customer_email,customer_phone,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (data) setTxs(data as Tx[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("transactions-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, (payload) => {
        load();
        const next = payload.new as Partial<Tx> | null;
        const prev = payload.old as Partial<Tx> | null;
        if (next?.status === "approved" && prev?.status !== "approved") {
          toast.success(`Venda aprovada${next.customer_name ? `: ${next.customer_name}` : ""}`);
            if (browserNotificationPermission() === "granted") {
              showBrowserNotification({
                title: "Venda aprovada",
                body: `${next.customer_name || "Cliente"} · ${formatBRL(next.amount || 0)}`,
                url: "/admin",
              });
            }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando vendas...</div>;

  const approved = txs.filter(t => t.status === "approved");
  const totalApproved = approved.reduce((s, t) => s + t.amount, 0);
  const pending = txs.filter(t => t.status === "pending" || t.status === "processing").length;
  const ticket = approved.length ? totalApproved / approved.length : 0;

  const cards = [
    { icon: DollarSign, label: "Receita aprovada", value: formatBRL(totalApproved), tint: "bg-emerald-500/15 text-emerald-300" },
    { icon: CheckCircle2, label: "Vendas pagas", value: approved.length, tint: "bg-sky-500/15 text-sky-300" },
    { icon: Clock, label: "Pendentes", value: pending, tint: "bg-amber-500/15 text-amber-300" },
    { icon: TrendingUp, label: "Ticket médio", value: formatBRL(ticket), tint: "bg-orange-500/15 text-orange-300" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-gradient-admin-card p-4 shadow-admin">
        <Button type="button" onClick={subscribePush} disabled={subscribing} className="bg-gradient-admin-accent shadow-admin-glow hover:opacity-90">
          <Bell className="h-4 w-4" /> {subscribing ? "Ativando..." : "Ativar notificação no Chrome"}
        </Button>
        <Button type="button" variant="secondary" onClick={sendTestPush} disabled={testingPush}>
          <BellRing className="h-4 w-4" /> {testingPush ? "Enviando teste..." : "Testar notificação"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-gradient-admin-card p-4 shadow-admin">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.tint}`}>
              <c.icon className="h-4 w-4" />
            </div>
            <div className="mt-3 text-xl font-extrabold tracking-tight">{c.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-gradient-admin-card shadow-admin">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-bold">Histórico de vendas</h3>
          <p className="text-xs text-muted-foreground">Atualizado em tempo real</p>
        </div>

        {txs.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma venda ainda.</div>
        ) : (
          <ul className="divide-y divide-border">
            {txs.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3 transition-smooth hover:bg-card/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-bold uppercase">
                  {(t.customer_name || "?").charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{t.customer_name || "Sem nome"}</span>
                    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusStyle(t.status)}`}>
                      {statusLabel[t.status] || t.status}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {t.plan_name || "—"} · {new Date(t.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-extrabold tabular-nums">{formatBRL(t.amount)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.reference.slice(-8)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
