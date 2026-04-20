import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Send, Bot, Link2, MessageSquare, Crown, KeyRound, Globe, Power } from "lucide-react";

interface TgSettings {
  id: string;
  bot_token: string | null;
  welcome_message: string;
  button_text: string;
  webapp_url: string | null;
  vip_invite_link: string | null;
  vip_message: string;
  active: boolean;
}

export const TelegramEditor = () => {
  const [s, setS] = useState<TgSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    supabase.from("telegram_settings").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) setS(data as TgSettings);
    });
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("telegram_settings").update({
      bot_token: s.bot_token,
      welcome_message: s.welcome_message,
      button_text: s.button_text,
      webapp_url: s.webapp_url,
      vip_invite_link: s.vip_invite_link,
      vip_message: s.vip_message,
      active: s.active,
    }).eq("id", s.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Configurações salvas!");
  };

  const testBot = async () => {
    if (!s?.bot_token) { toast.error("Cole o token primeiro"); return; }
    setTesting(true);
    try {
      const r = await fetch(`https://api.telegram.org/bot${s.bot_token}/getMe`);
      const data = await r.json();
      if (data.ok) toast.success(`Bot conectado: @${data.result.username}`);
      else toast.error("Token inválido");
    } catch {
      toast.error("Erro ao conectar");
    }
    setTesting(false);
  };

  const triggerPoll = async () => {
    const { error } = await supabase.functions.invoke("telegram-poll");
    if (error) toast.error(error.message);
    else toast.success("Polling executado");
  };

  if (!s) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-5">
      {/* Hero / Status */}
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-admin-card p-5 shadow-admin">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-admin-accent shadow-admin-glow">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold">Bot do Telegram</h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.active ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                {s.active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ative o bot, configure a mensagem de boas-vindas e o canal VIP. O bot responde a /start automaticamente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Power className={`h-4 w-4 ${s.active ? "text-emerald-400" : "text-muted-foreground"}`} />
            <Switch checked={s.active} onCheckedChange={(v) => setS({ ...s, active: v })} />
          </div>
        </div>
      </div>

      {/* Token */}
      <div className="space-y-3 rounded-2xl border border-border bg-gradient-admin-card p-5 shadow-admin">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Token do Bot</Label>
        </div>
        <Input
          type="password"
          placeholder="123456789:ABCdef..."
          value={s.bot_token || ""}
          onChange={(e) => setS({ ...s, bot_token: e.target.value })}
          className="bg-card/50 font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={testBot} disabled={testing} className="text-xs">
            {testing ? "Testando..." : "Testar conexão"}
          </Button>
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-card/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Abrir @BotFather <Link2 className="h-3 w-3" />
          </a>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Crie um bot no @BotFather, copie o token e cole aqui.
        </p>
      </div>

      {/* Welcome */}
      <div className="space-y-4 rounded-2xl border border-border bg-gradient-admin-card p-5 shadow-admin">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Mensagem de boas-vindas</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Texto exibido no /start</Label>
          <Textarea
            rows={3}
            value={s.welcome_message}
            onChange={(e) => setS({ ...s, welcome_message: e.target.value })}
            className="bg-card/50"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Texto do botão</Label>
            <Input
              value={s.button_text}
              onChange={(e) => setS({ ...s, button_text: e.target.value })}
              className="bg-card/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
              <Globe className="h-3 w-3" /> URL do site (WebApp)
            </Label>
            <Input
              placeholder="https://seusite.com"
              value={s.webapp_url || ""}
              onChange={(e) => setS({ ...s, webapp_url: e.target.value })}
              className="bg-card/50"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-border bg-card/30 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pré-visualização</div>
          <div className="mt-2 rounded-lg bg-card p-3 text-sm">
            <div className="whitespace-pre-wrap">{s.welcome_message}</div>
            <button className="mt-3 w-full rounded-md bg-gradient-admin-accent px-3 py-2 text-xs font-bold text-white shadow-admin-glow">
              {s.button_text}
            </button>
          </div>
        </div>
      </div>

      {/* VIP */}
      <div className="space-y-4 rounded-2xl border border-border bg-gradient-admin-card p-5 shadow-admin">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Canal VIP (após pagamento)</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Link de convite do canal</Label>
          <Input
            placeholder="https://t.me/+abc123..."
            value={s.vip_invite_link || ""}
            onChange={(e) => setS({ ...s, vip_invite_link: e.target.value })}
            className="bg-card/50"
          />
          <p className="text-[11px] text-muted-foreground">
            Crie no Telegram: clique no canal → Convidar via link → copie o link.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mensagem enviada após o pagamento</Label>
          <Textarea
            rows={3}
            value={s.vip_message}
            onChange={(e) => setS({ ...s, vip_message: e.target.value })}
            className="bg-card/50"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={saving} size="lg" className="flex-1 bg-gradient-admin-accent shadow-admin-glow hover:opacity-90">
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
        <Button onClick={triggerPoll} variant="secondary" size="lg">
          <Send className="mr-1 h-4 w-4" /> Forçar polling
        </Button>
      </div>
    </div>
  );
};
