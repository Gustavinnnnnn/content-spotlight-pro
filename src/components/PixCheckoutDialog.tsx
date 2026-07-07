import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Loader2, QrCode, Clock, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price_label: string;
}

interface PixData {
  reference: string;
  qr_code: string;
  qr_code_base64: string;
  amount: number;
  expires_at?: string;
}

interface Props {
  plan: Plan | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const formatCents = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;

const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const copyText = async (text: string): Promise<boolean> => {
  // Try modern clipboard API
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* fall through */ }
  // Fallback: hidden textarea + execCommand
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.setAttribute("readonly", "");
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

export const PixCheckoutDialog = ({ plan, open, onOpenChange }: Props) => {
  const [step, setStep] = useState<"form" | "pix" | "paid">("form");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pix, setPix] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("form");
        setPix(null);
        setCopied(false);
      }, 200);
    }
  }, [open]);

  useEffect(() => {
    if (step !== "pix") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => {
    if (step !== "pix" || !pix?.reference) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.functions.invoke("paradise-check-status", {
        body: { reference: pix.reference },
      });
      if (data?.status === "approved") {
        setStep("paid");
        toast.success("Pagamento confirmado!");
      } else if (data?.status === "failed" || data?.status === "refunded") {
        toast.error("Pagamento não aprovado.");
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [step, pix?.reference]);

  const remaining = useMemo(() => {
    if (!pix?.expires_at) return null;
    const ms = new Date(pix.expires_at).getTime() - now;
    if (ms <= 0) return "expirado";
    const mm = Math.floor(ms / 60000);
    const ss = Math.floor((ms % 60000) / 1000);
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }, [pix?.expires_at, now]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    const ph = onlyDigits(phone);

    if (name.trim().length < 2) return toast.error("Informe seu nome completo.");
    if (ph.length < 10) return toast.error("Telefone inválido — inclua o DDD.");

    setLoading(true);
    const tgChatId = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null;

    const { data, error } = await supabase.functions.invoke("paradise-create-pix", {
      body: {
        planId: plan.id,
        customer: { name: name.trim(), phone: ph },
        telegram_chat_id: tgChatId,
      },
    });
    setLoading(false);

    if (error || !data?.qr_code) {
      toast.error(data?.error || "Não foi possível gerar o PIX. Tente novamente.");
      return;
    }
    setPix(data as PixData);
    setStep("pix");
  };

  const copyCode = async () => {
    if (!pix) return;
    const ok = await copyText(pix.qr_code);
    if (ok) {
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error("Não foi possível copiar. Toque e segure o código para copiar manualmente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto border-border/70 bg-card p-0">
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-warm-hero px-6 py-5">
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, hsl(0 0% 100% / 0.25), transparent 50%)" }} />
          <DialogHeader className="relative space-y-1">
            <DialogTitle className="font-display text-2xl font-bold text-white">
              {plan?.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-white/85">
              {step === "form" && `Pagamento via PIX · ${plan?.price_label}`}
              {step === "pix" && "Escaneie o QR ou copie o código."}
              {step === "paid" && "Tudo certo!"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
                placeholder="Como você quer ser chamado"
                className="h-11 rounded-xl bg-background/60 text-sm"
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telefone (WhatsApp)</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                inputMode="numeric"
                maxLength={16}
                placeholder="(11) 99999-9999"
                required
                className="h-11 rounded-xl bg-background/60 text-sm"
                autoComplete="tel-national"
              />
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Pagamento processado pela Paradise. Seus dados servem apenas para gerar o PIX e liberar seu acesso.
              </p>
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-gradient-warm-hero text-base font-bold text-white shadow-warm-glow hover:opacity-95"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando PIX...</>
              ) : (
                <><QrCode className="mr-2 h-4 w-4" /> Gerar PIX de {plan?.price_label}</>
              )}
            </Button>
          </form>
        )}

        {step === "pix" && pix && (
          <div className="space-y-4">
            {/* QR Code */}
            <div className="mx-auto flex w-fit flex-col items-center gap-3 rounded-2xl border-4 border-primary/20 bg-white p-4 shadow-warm-glow">
              {pix.qr_code_base64 ? (
                <img
                  src={pix.qr_code_base64.startsWith("data:") ? pix.qr_code_base64 : `data:image/png;base64,${pix.qr_code_base64}`}
                  alt="QR Code PIX"
                  className="h-56 w-56 rounded-lg"
                />
              ) : (
                <QRCodeSVG value={pix.qr_code} size={224} level="M" includeMargin={false} />
              )}
            </div>

            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Total a pagar</div>
              <div className="font-display text-3xl font-bold text-foreground">{formatCents(pix.amount)}</div>
              {remaining && (
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {remaining === "expirado" ? "PIX expirado" : `Expira em ${remaining}`}
                </div>
              )}
            </div>

            {/* Copy code */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Ou copie o código PIX (copia e cola)
              </Label>
              <div className="group relative overflow-hidden rounded-xl border border-border bg-background/60 p-3">
                <p className="max-h-16 overflow-hidden break-all pr-2 font-mono text-[11px] leading-relaxed text-foreground/85">
                  {pix.qr_code}
                </p>
              </div>
              <Button
                type="button"
                onClick={copyCode}
                className="h-12 w-full rounded-xl bg-gradient-warm-hero text-sm font-bold text-white shadow-warm-glow hover:opacity-95"
              >
                {copied ? (
                  <><Check className="mr-2 h-4 w-4" /> Copiado!</>
                ) : (
                  <><Copy className="mr-2 h-4 w-4" /> Copiar código PIX</>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 p-3 text-xs text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="font-semibold">Aguardando confirmação do pagamento...</span>
            </div>
          </div>
        )}

        {step === "paid" && (
          <div className="space-y-3 py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <Check className="h-8 w-8 text-primary" strokeWidth={3} />
            </div>
            <h3 className="font-display text-2xl font-bold">Pagamento aprovado!</h3>
            <p className="text-sm text-muted-foreground">Enviaremos suas instruções agora mesmo.</p>
            <Button onClick={() => onOpenChange(false)} className="mt-2 h-11 w-full rounded-xl bg-gradient-warm-hero text-sm font-bold text-white shadow-warm-glow">
              Fechar
            </Button>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
