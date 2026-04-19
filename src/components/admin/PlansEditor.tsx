import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";
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
    <div className="space-y-4 rounded-2xl bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Planos</h2>
        <Button onClick={add} size="sm"><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>

      {plans.map((p, i) => (
        <div key={p.id} className="space-y-3 rounded-xl border-2 border-border p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={p.name} onChange={(e) => update(i, { name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Preço (texto)</Label>
              <Input value={p.price_label} onChange={(e) => update(i, { price_label: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={p.description || ""} onChange={(e) => update(i, { description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Link de checkout</Label>
            <Input placeholder="https://..." value={p.checkout_url || ""} onChange={(e) => update(i, { checkout_url: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <Input type="color" value={p.color} onChange={(e) => update(i, { color: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Badge</Label>
              <Input placeholder="Ex: POPULAR" value={p.badge || ""} onChange={(e) => update(i, { badge: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Ordem</Label>
              <Input type="number" value={p.sort_order} onChange={(e) => update(i, { sort_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center gap-2"><Switch checked={p.highlighted} onCheckedChange={(v) => update(i, { highlighted: v })} /><span className="text-xs">Destaque</span></div>
              <div className="flex items-center gap-2"><Switch checked={p.active} onCheckedChange={(v) => update(i, { active: v })} /><span className="text-xs">Ativo</span></div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => save(p)}>Salvar</Button>
          </div>
        </div>
      ))}
    </div>
  );
};
