import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Receipt, Trash2 } from "lucide-react";
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

  useEffect(() => {
    load();
  }, []);

  const update = (index: number, patch: Partial<Fee>) => {
    setFees((current) => current.map((fee, i) => (i === index ? { ...fee, ...patch } : fee)));
  };

  const save = async (fee: Fee) => {
    const { id, ...rest } = fee;
    const { error } = await supabase.from("post_purchase_fees" as never).update(rest as never).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Taxa salva");
  };

  const add = async () => {
    const { error } = await supabase.from("post_purchase_fees" as never).insert({
      name: `Taxa ${fees.length + 1}`,
      description: "",
      amount: 1000,
      sort_order: fees.length + 1,
      active: true,
    } as never);

    if (error) toast.error(error.message);
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta taxa?")) return;
    const { error } = await supabase.from("post_purchase_fees" as never).delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Taxa removida");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-gradient-admin-card p-4 shadow-admin">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-admin-accent shadow-admin-glow">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">Taxas sequenciais</h2>
            <p className="text-xs text-muted-foreground">Crie quantas etapas extras de pagamento quiser antes da liberação final.</p>
          </div>
        </div>
        <Button onClick={add} size="sm" className="bg-gradient-admin-accent shadow-admin-glow hover:opacity-90">
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      </div>

      {fees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center text-sm text-muted-foreground">
          Nenhuma taxa cadastrada. Se deixar vazio, o cliente recebe o acesso assim que o pagamento principal for aprovado.
        </div>
      ) : (
        fees.map((fee, index) => (
          <div key={fee.id} className="space-y-4 rounded-2xl border border-border bg-gradient-admin-card p-5 shadow-admin">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold">{fee.name}</div>
                <div className="text-xs text-muted-foreground">Etapa {fee.sort_order} · {formatBRL(fee.amount)}</div>
              </div>
              {!fee.active && (
                <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Inativa
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome da taxa</Label>
                <Input value={fee.name} onChange={(e) => update(index, { name: e.target.value })} className="bg-card/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Valor em centavos</Label>
                <Input
                  type="number"
                  min={100}
                  step={100}
                  value={fee.amount}
                  onChange={(e) => update(index, { amount: Math.max(100, parseInt(e.target.value || "0", 10) || 100) })}
                  className="bg-card/50"
                />
                <p className="text-[11px] text-muted-foreground">Exibido ao cliente como {formatBRL(fee.amount)}.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
                <Textarea
                  rows={3}
                  value={fee.description || ""}
                  onChange={(e) => update(index, { description: e.target.value })}
                  className="bg-card/50"
                />
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ordem</Label>
                  <Input
                    type="number"
                    min={1}
                    value={fee.sort_order}
                    onChange={(e) => update(index, { sort_order: Math.max(1, parseInt(e.target.value || "1", 10) || 1) })}
                    className="bg-card/50"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-card/40 px-2.5 py-2">
                  <span className="text-xs font-medium">Ativa</span>
                  <Switch checked={fee.active} onCheckedChange={(value) => update(index, { active: value })} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button variant="ghost" size="sm" onClick={() => remove(fee.id)} className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300">
                <Trash2 className="mr-1 h-4 w-4" /> Excluir
              </Button>
              <Button size="sm" onClick={() => save(fee)} className="bg-gradient-admin-accent shadow-admin-glow hover:opacity-90">
                Salvar
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};