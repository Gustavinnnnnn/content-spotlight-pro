import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, CheckCircle2, Clock, DollarSign, Bell, BellRing, Image as ImageIcon, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface FeeTx {
  id: string;
  fee_name: string;
  amount: number;
  status: string;
}

interface NotificationSettings {
  id: string;
  sale_title: string;
  sale_body_template: string;
  sale_icon_url: string | null;
  fee_title: string;
  fee_body_template: string;
  fee_icon_url: string | null;
}

const formatBRL = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

const replaceTemplate = (template: string, values: Record<string, string>) =>
  template.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => values[key] ?? "");

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
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<"sale" | "fee" | null>(null);

  const salePreviewBody = replaceTemplate(settings?.sale_body_template || "{{customer_name}} · {{amount}}", {
    customer_name: "Cliente teste",
    amount: formatBRL(1990),
    plan_name: "Plano VIP",
    reference: "ABC12345",
  });

  const feePreviewBody = replaceTemplate(settings?.fee_body_template || "{{fee_name}} · {{amount}}", {
    fee_name: "Taxa de liberação",
    amount: formatBRL(990),
    reference: "TAXA1234",
  });

  const load = async () => {
    const [{ data: txData }, { data: settingsData }] = await Promise.all([
      supabase
        .from("transactions")
        .select("id,reference,plan_name,amount,status,customer_name,customer_email,customer_phone,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("admin_notification_settings")
        .select("id,sale_title,sale_body_template,sale_icon_url,fee_title,fee_body_template,fee_icon_url")
        .limit(1)
        .maybeSingle(),
    ]);

    if (txData) setTxs(txData as Tx[]);
    if (settingsData) setSettings(settingsData as NotificationSettings);
    setLoading(false);
  };

  const notifySale = (tx: Partial<Tx>) => {
    if (browserNotificationPermission() !== "granted") return;

    showBrowserNotification({
      title: settings?.sale_title || "Venda aprovada",
      body: replaceTemplate(settings?.sale_body_template || "{{customer_name}} · {{amount}}", {
        customer_name: tx.customer_name || "Cliente",
        amount: formatBRL(tx.amount || 0),
        plan_name: tx.plan_name || "Plano",
        reference: tx.reference?.slice(-8) || "",
      }),
      url: "/admin",
      icon: settings?.sale_icon_url || undefined,
      badge: settings?.sale_icon_url || undefined,
      image: settings?.sale_icon_url || undefined,
    });
  };

  const notifyFee = (fee: Partial<FeeTx>) => {
    if (browserNotificationPermission() !== "granted") return;

    showBrowserNotification({
      title: settings?.fee_title || "Taxa aprovada",
      body: replaceTemplate(settings?.fee_body_template || "{{fee_name}} · {{amount}}", {
        fee_name: fee.fee_name || "Taxa",
        amount: formatBRL(fee.amount || 0),
        reference: "",
      }),
      url: "/admin",
      icon: settings?.fee_icon_url || undefined,
      badge: settings?.fee_icon_url || undefined,
      image: settings?.fee_icon_url || undefined,
    });
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { id, ...payload } = settings;
    const { error } = await supabase.from("admin_notification_settings").update(payload).eq("id", id);
    setSavingSettings(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Notificações salvas");
  };

  const uploadNotificationImage = async (target: "sale" | "fee", file: File) => {
    setUploadingTarget(target);
    const path = `admin-notifications/${target}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("club-assets").upload(path, file, { upsert: true });

    setUploadingTarget(null);
    if (error) {
      toast.error(error.message);
      return;
    }

    const { data } = supabase.storage.from("club-assets").getPublicUrl(path);
    setSettings((current) => current ? {
      ...current,
      sale_icon_url: target === "sale" ? data.publicUrl : current.sale_icon_url,
      fee_icon_url: target === "fee" ? data.publicUrl : current.fee_icon_url,
    } : current);
    toast.success("Imagem da notificação atualizada");
  };

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
    if (permission !== "granted") {
      setTestingPush(false);
      toast.error("Ative a permissão primeiro");
      return;
    }

    const result = showBrowserNotification({
      title: settings?.sale_title || "Venda aprovada",
      body: salePreviewBody,
      url: "/admin",
      icon: settings?.sale_icon_url || undefined,
      badge: settings?.sale_icon_url || undefined,
      image: settings?.sale_icon_url || undefined,
    });
    setTestingPush(false);
    if (!result) {
      toast.error("Não foi possível disparar a notificação neste navegador");
      return;
    }

    toast.success("Notificação de teste enviada");
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel("transactions-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, (payload) => {
        load();
        const next = payload.new as Partial<Tx> | null;
        const prev = payload.old as Partial<Tx> | null;
        if (next?.status === "approved" && prev?.status !== "approved") {
          toast.success(`Venda aprovada${next.customer_name ? `: ${next.customer_name}` : ""}`);
          notifySale(next);
        }
      })
      .subscribe();

    const feeChannel = supabase
      .channel("transaction-fees-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "transaction_fees" }, (payload) => {
        const next = payload.new as Partial<FeeTx> | null;
        const prev = payload.old as Partial<FeeTx> | null;
        if (next?.status === "approved" && prev?.status !== "approved") {
          toast.success(`Taxa aprovada${next.fee_name ? `: ${next.fee_name}` : ""}`);
          notifyFee(next);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(feeChannel);
    };
  }, [settings?.sale_title, settings?.sale_body_template, settings?.sale_icon_url, settings?.fee_title, settings?.fee_body_template, settings?.fee_icon_url]);

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

      {settings && (
        <div className="space-y-4 rounded-2xl border border-border bg-gradient-admin-card p-5 shadow-admin">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold">Notificações do navegador</h3>
              <p className="text-xs text-muted-foreground">No Chrome dá para editar texto e imagem/ícone. O layout do card em si é do próprio navegador.</p>
            </div>
            <Button type="button" onClick={saveSettings} disabled={savingSettings} className="bg-gradient-admin-accent shadow-admin-glow hover:opacity-90">
              <Save className="h-4 w-4" /> {savingSettings ? "Salvando..." : "Salvar notificações"}
            </Button>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-border bg-card/30 p-4">
              <div>
                <h4 className="text-sm font-semibold">Venda aprovada</h4>
                <p className="text-[11px] text-muted-foreground">{"Variáveis: {{customer_name}}, {{amount}}, {{plan_name}}, {{reference}}"}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Título</Label>
                <Input value={settings.sale_title} onChange={(e) => setSettings({ ...settings, sale_title: e.target.value })} className="bg-card/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Texto</Label>
                <Textarea rows={3} value={settings.sale_body_template} onChange={(e) => setSettings({ ...settings, sale_body_template: e.target.value })} className="bg-card/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Imagem / ícone</Label>
                <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-smooth hover:bg-secondary/80">
                  <Upload className="h-4 w-4" />
                  <span>{uploadingTarget === "sale" ? "Enviando..." : "Enviar imagem"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadNotificationImage("sale", e.target.files[0])} />
                </Label>
                {settings.sale_icon_url && <img src={settings.sale_icon_url} alt="Preview da notificação de venda" className="h-20 w-20 rounded-lg border border-border object-cover" />}
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {settings.sale_icon_url ? <img src={settings.sale_icon_url} alt="Ícone da venda" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{settings.sale_title}</div>
                    <div className="text-xs text-muted-foreground">{salePreviewBody}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-card/30 p-4">
              <div>
                <h4 className="text-sm font-semibold">Taxa aprovada</h4>
                <p className="text-[11px] text-muted-foreground">{"Variáveis: {{fee_name}}, {{amount}}"}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Título</Label>
                <Input value={settings.fee_title} onChange={(e) => setSettings({ ...settings, fee_title: e.target.value })} className="bg-card/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Texto</Label>
                <Textarea rows={3} value={settings.fee_body_template} onChange={(e) => setSettings({ ...settings, fee_body_template: e.target.value })} className="bg-card/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Imagem / ícone</Label>
                <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-smooth hover:bg-secondary/80">
                  <Upload className="h-4 w-4" />
                  <span>{uploadingTarget === "fee" ? "Enviando..." : "Enviar imagem"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadNotificationImage("fee", e.target.files[0])} />
                </Label>
                {settings.fee_icon_url && <img src={settings.fee_icon_url} alt="Preview da notificação de taxa" className="h-20 w-20 rounded-lg border border-border object-cover" />}
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {settings.fee_icon_url ? <img src={settings.fee_icon_url} alt="Ícone da taxa" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{settings.fee_title}</div>
                    <div className="text-xs text-muted-foreground">{feePreviewBody}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
