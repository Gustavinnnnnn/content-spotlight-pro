import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Tag, Star } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price_label: string;
  description: string | null;
  checkout_url: string | null;
  color: string;
  highlighted: boolean;
  badge: string | null;
  sort_order: number;
  active: boolean;
}

export const PlansEditor = () => {
  const [plans, setPlans] = useState<Plan[]>([]);

  const load = async () => {
    const { data } = await supabase.from("plans").select("*").order("sort_order");
    if (data) setPlans(data as Plan[]);
  };
  useEffect(() => { load(); }, []);

  const update = (i: number, patch: Partial<Plan>) => {
    setPlans((p) => p.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  };

  const save = async (p: Plan) => {
    const { id, ...rest } = p;
    const { error } = await supabase.from("plans").update(rest).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Plano salvo");
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removido"); load(); }
  };

  const add = async () => {
    const { error } = await supabase.from("plans").insert({
      name: "Novo plano", price_label: "R$ 0,00", color: "#FF6B1A",
      sort_order: plans.length + 1,
    });
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-gradient-admin-card p-4 shadow-admin">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-admin-accent shadow-admin-glow">
            <Tag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">Planos</h2>
            <p className="text-xs text-muted-foreground">{plans.length} plano(s) cadastrado(s)</p>
          </div>
        </div>
        <Button onClick={add} size="sm" className="bg-gradient-admin-accent shadow-admin-glow hover:opacity-90">
          <Plus className="h-4 w-4 mr-1" />Adicionar
        </Button>
      </div>

      {plans.map((p, i) => (
        <div key={p.id} className="space-y-4 rounded-2xl border border-border bg-gradient-admin-card p-5 shadow-admin">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-3 w-3 rounded-full ring-2 ring-border shrink-0" style={{ backgroundColor: p.color }} />
              <span className="truncate text-sm font-bold">{p.name}</span>
              {p.highlighted && (
                <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  <Star className="h-3 w-3" /> Destaque
                </span>
              )}
              {!p.active && (
                <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                  Inativo
                </span>
              )}
            </div>
            <span className="text-sm font-extrabold text-primary shrink-0">{p.price_label}</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
              <Input value={p.name} onChange={(e) => update(i, { name: e.target.value })} className="bg-card/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Preço (texto)</Label>
              <Input value={p.price_label} onChange={(e) => update(i, { price_label: e.target.value })} className="bg-card/50" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</Label>
            <Input value={p.description || ""} onChange={(e) => update(i, { description: e.target.value })} className="bg-card/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Link de checkout (opcional)</Label>
            <Input placeholder="Deixe vazio para usar PIX nativo" value={p.checkout_url || ""} onChange={(e) => update(i, { checkout_url: e.target.value })} className="bg-card/50" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cor</Label>
              <Input type="color" value={p.color} onChange={(e) => update(i, { color: e.target.value })} className="h-10 cursor-pointer p-1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Badge</Label>
              <Input placeholder="Ex: POPULAR" value={p.badge || ""} onChange={(e) => update(i, { badge: e.target.value })} className="bg-card/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ordem</Label>
              <Input type="number" value={p.sort_order} onChange={(e) => update(i, { sort_order: parseInt(e.target.value) || 0 })} className="bg-card/50" />
            </div>
            <div className="flex flex-col justify-end gap-2">
              <div className="flex items-center justify-between rounded-lg bg-card/40 px-2.5 py-1.5">
                <span className="text-xs font-medium">Destaque</span>
                <Switch checked={p.highlighted} onCheckedChange={(v) => update(i, { highlighted: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-card/40 px-2.5 py-1.5">
                <span className="text-xs font-medium">Ativo</span>
                <Switch checked={p.active} onCheckedChange={(v) => update(i, { active: v })} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="ghost" size="sm" onClick={() => remove(p.id)} className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300">
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
            <Button size="sm" onClick={() => save(p)} className="bg-gradient-admin-accent shadow-admin-glow hover:opacity-90">
              Salvar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
