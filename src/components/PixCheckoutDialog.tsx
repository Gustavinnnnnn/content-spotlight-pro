import { useEffect, useState } from "react";
import { Copy, Check, Loader2, QrCode } from "lucide-react";
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

export const PixCheckoutDialog = ({ plan, open, onOpenChange }: Props) => {
  const [step, setStep] = useState<"form" | "pix" | "paid">("form");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [pix, setPix] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("form");
        setPix(null);
        setCopied(false);
      }, 200);
    }
  }, [open]);

  // Poll status when PIX is shown
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;

    const doc = onlyDigits(document);
    const ph = onlyDigits(phone);

    if (name.trim().length < 2) return toast.error("Informe seu nome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("E-mail inválido.");
    if (doc.length !== 11 && doc.length !== 14) return toast.error("CPF ou CNPJ inválido.");
    if (ph.length < 10) return toast.error("Telefone inválido (com DDD).");

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("paradise-create-pix", {
      body: {
        planId: plan.id,
        customer: { name: name.trim(), email: email.trim(), document: doc, phone: ph },
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
    await navigator.clipboard.writeText(pix.qr_code);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base">{plan?.name}</DialogTitle>
          <DialogDescription className="text-xs">
            {step === "form" && `Pague ${plan?.price_label} via PIX.`}
            {step === "pix" && "Escaneie o QR Code ou copie o código PIX."}
            {step === "paid" && "Acesso liberado!"}
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} required className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="doc" className="text-xs">CPF/CNPJ</Label>
                <Input id="doc" value={document} onChange={(e) => setDocument(e.target.value)} inputMode="numeric" maxLength={18} required className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs">Telefone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={15} placeholder="(11) 99999-9999" required className="h-9 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full h-9 text-sm mt-1" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Gerando...</> : <><QrCode className="mr-2 h-3 w-3" /> Gerar PIX</>}
            </Button>
          </form>
        )}

        {step === "pix" && pix && (
          <div className="space-y-3">
            <div className="flex justify-center rounded-lg bg-white p-3 shadow-sm">
              {pix.qr_code_base64 ? (
                <img src={pix.qr_code_base64} alt="QR Code PIX" className="h-44 w-44 rounded" />
              ) : (
                <QRCodeSVG value={pix.qr_code} size={176} level="M" includeMargin={false} />
              )}
            </div>            
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor</div>
              <div className="text-lg font-bold">{formatCents(pix.amount)}</div>
            </div>            
            <div className="space-y-1.5">
              <Label className="text-[10px]">Código PIX (copie e cole)</Label>
              <div className="flex gap-2">
                <Input readOnly value={pix.qr_code} className="font-mono text-[10px] h-8" onFocus={(e) => e.currentTarget.select()} />
                <Button type="button" variant="secondary" size="icon" className="h-8 w-8" onClick={copyCode} aria-label="Copiar código">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>            
            <div className="flex items-center justify-center gap-2 rounded-md bg-muted/60 p-2 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Aguardando pagamento...
            </div>
          </div>
        )}

        {step === "paid" && (
          <div className="space-y-2 py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-bold">Pagamento aprovado!</h3>
            <p className="text-xs text-muted-foreground">Acesso liberado. Em breve entraremos em contato.</p>
            <Button onClick={() => onOpenChange(false)} className="w-full h-9 text-sm mt-2">Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
