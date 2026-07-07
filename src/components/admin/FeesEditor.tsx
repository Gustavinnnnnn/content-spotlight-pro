import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Plus, Receipt, Trash2, Pencil, GripVertical, CheckCircle2, PowerOff } from "lucide-react";
import { toast } from "sonner";

interface Fee {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  sort_order: number;
  active: boolean;
}

const formatBRL = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

export const FeesEditor = () => {
  const [fees, setFees] = useState<Fee[]>([]);
  const [editing, setEditing] = useState<Fee | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("post_purchase_fees" as never)
      .select("*")
      .order("sort_order")
      .order("created_at");

    if (error) {
      toast.error(error.message);
      return;
    }
    setFees((data || []) as unknown as Fee[]);
  };

  useEffect(() => { load(); }, []);

  const patchEditing = (patch: Partial<Fee>) =>
    setEditing((e) => (e ? { ...e, ...patch } : e));

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, ...rest } = editing;
    const { error } = await supabase.from("post_purchase_fees" as never).update(rest as never).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Taxa salva");
    setEditing(null);
    load();
  };

  const add = async () => {
    const { data, error } = await supabase
      .from("post_purchase_fees" as never)
      .insert({
        name: `Taxa ${fees.length + 1}`,
        description: "",
        amount: 1000,
        sort_order: fees.length + 1,
        active: true,
      } as never)
      .select()
      .single();

    if (error) return toast.error(error.message);
    await load();
    setEditing(data as unknown as Fee);
  };

  const toggleActive = async (fee: Fee) => {
    const { error } = await supabase.from("post_purchase_fees" as never).update({ active: !fee.active } as never).eq("id", fee.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta taxa?")) return;
    const { error } = await supabase.from("post_purchase_fees" as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Taxa removida");
    load();
  };

  const totalCents = fees.filter((f) => f.active).reduce((s, f) => s + f.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-gradient-admin-card p-5 shadow-admin">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-admin-accent shadow-admin-glow">
              <Receipt className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Taxas sequenciais</h2>
              <p className="text-xs text-muted-foreground">Etapas extras cobradas depois do pagamento principal.</p>
            </div>
          </div>
          <Button onClick={add} className="bg-gradient-admin-accent shadow-admin-glow hover:opacity-90">
            <Plus className="mr-1 h-4 w-4" /> Nova taxa
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</div>
            <div className="mt-1 text-lg font-extrabold">{fees.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ativas</div>
            <div className="mt-1 text-lg font-extrabold text-emerald-300">{fees.filter((f) => f.active).length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor extra</div>
            <div className="mt-1 text-lg font-extrabold text-primary">{formatBRL(totalCents)}</div>
          </div>
        </div>
      </div>

      {/* Fee cards (compact) */}
      {fees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center text-sm text-muted-foreground">
          Nenhuma taxa cadastrada. Se deixar vazio, o cliente recebe o acesso VIP direto após o pagamento do plano.
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {fees.map((fee) => (
            <div
              key={fee.id}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-gradient-admin-card p-3.5 shadow-admin transition-smooth hover:shadow-admin-glow"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-admin-accent text-sm font-black text-white shadow-admin-glow">
                {fee.sort_order}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold">{fee.name}</span>
                  {!fee.active && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">off</span>
                  )}
                </div>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-lg font-extrabold text-primary">{formatBRL(fee.amount)}</span>
                  {fee.description && (
                    <span className="truncate text-[11px] text-muted-foreground">· {fee.description}</span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleActive(fee)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label={fee.active ? "Desativar" : "Ativar"}
                >
                  {fee.active ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <PowerOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(fee)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(fee.id)}
                  className="h-8 w-8 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit sheet */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="admin-scope w-full border-border bg-gradient-admin-bg sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-admin-accent text-white shadow-admin-glow">
                <Receipt className="h-4 w-4" />
              </span>
              Editar taxa
            </SheetTitle>
            <SheetDescription>Configure o valor, descrição e ordem de cobrança.</SheetDescription>
          </SheetHeader>

          {editing && (
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
                <Input value={editing.name} onChange={(e) => patchEditing({ name: e.target.value })} className="bg-card/50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Valor (centavos)</Label>
                  <Input
                    type="number"
                    min={100}
                    step={100}
                    value={editing.amount}
                    onChange={(e) => patchEditing({ amount: Math.max(100, parseInt(e.target.value || "0", 10) || 100) })}
                    className="bg-card/50"
                  />
                  <p className="text-[11px] text-muted-foreground">Exibido como {formatBRL(editing.amount)}.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ordem</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editing.sort_order}
                    onChange={(e) => patchEditing({ sort_order: Math.max(1, parseInt(e.target.value || "1", 10) || 1) })}
                    className="bg-card/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
                <Textarea
                  rows={4}
                  value={editing.description || ""}
                  onChange={(e) => patchEditing({ description: e.target.value })}
                  placeholder="Mensagem exibida ao cliente ao cobrar esta taxa."
                  className="bg-card/50"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 px-3 py-2.5">
                <div>
                  <div className="text-sm font-semibold">Ativa</div>
                  <div className="text-[11px] text-muted-foreground">Se desativada, esta etapa é ignorada.</div>
                </div>
                <Switch checked={editing.active} onCheckedChange={(v) => patchEditing({ active: v })} />
              </div>
            </div>
          )}

          <SheetFooter className="mt-6 flex-row gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)} className="flex-1">Cancelar</Button>
            <Button onClick={save} disabled={saving} className="flex-1 bg-gradient-admin-accent shadow-admin-glow">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
