import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, MousePointerClick, ShoppingCart, TrendingUp } from "lucide-react";

interface EventRow {
  event_type: string;
  plan_id: string | null;
  created_at: string;
}

interface Plan { id: string; name: string; }

export const DashboardEditor = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [e, p] = await Promise.all([
        supabase.from("site_events").select("event_type,plan_id,created_at").gte("created_at", since).order("created_at", { ascending: false }),
        supabase.from("plans").select("id,name"),
      ]);
      if (e.data) setEvents(e.data as EventRow[]);
      if (p.data) setPlans(p.data as Plan[]);
      setLoading(false);
    };
    load();
  }, []);

  const today = new Date(); today.setHours(0,0,0,0);
  const last7 = new Date(Date.now() - 7 * 86400000);

  const count = (type: string, since?: Date) =>
    events.filter(e => e.event_type === type && (!since || new Date(e.created_at) >= since)).length;

  const views = count("view");
  const clicks = count("plan_click");
  const purchases = count("purchase");
  const ctr = views ? ((clicks / views) * 100).toFixed(1) : "0";

  const planClicks = plans.map(p => ({
    name: p.name,
    clicks: events.filter(e => e.event_type === "plan_click" && e.plan_id === p.id).length,
  }));

  // Daily series last 7 days
  const days: { label: string; views: number; clicks: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const dayEvents = events.filter(e => {
      const t = new Date(e.created_at);
      return t >= d && t < next;
    });
    days.push({
      label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      views: dayEvents.filter(e => e.event_type === "view").length,
      clicks: dayEvents.filter(e => e.event_type === "plan_click").length,
    });
  }
  const maxBar = Math.max(1, ...days.map(d => Math.max(d.views, d.clicks)));

  if (loading) return <div className="text-sm text-muted-foreground">Carregando dashboard...</div>;

  const cards = [
    { icon: Eye, label: "Visitas (30d)", value: views, color: "text-primary" },
    { icon: MousePointerClick, label: "Cliques nos planos", value: clicks, color: "text-primary-deep" },
    { icon: ShoppingCart, label: "Compras", value: purchases, color: "text-primary" },
    { icon: TrendingUp, label: "Taxa conversão", value: `${ctr}%`, color: "text-primary-deep" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className="rounded-2xl bg-card p-4 shadow-card">
            <c.icon className={`h-5 w-5 ${c.color}`} />
            <div className="mt-2 text-2xl font-extrabold">{c.value}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-card">
        <h3 className="mb-4 text-sm font-bold">Últimos 7 dias</h3>
        <div className="flex h-40 items-end gap-2">
          {days.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end gap-0.5">
                <div className="flex-1 rounded-t bg-primary/30" style={{ height: `${(d.views / maxBar) * 100}%` }} title={`${d.views} visitas`} />
                <div className="flex-1 rounded-t bg-primary" style={{ height: `${(d.clicks / maxBar) * 100}%` }} title={`${d.clicks} cliques`} />
              </div>
              <div className="text-[10px] text-muted-foreground">{d.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-primary/30" /> Visitas</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-primary" /> Cliques</span>
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-card">
        <h3 className="mb-3 text-sm font-bold">Cliques por plano (30d)</h3>
        {planClicks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {planClicks.map(p => {
              const max = Math.max(1, ...planClicks.map(x => x.clicks));
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-medium">{p.name}</span>
                  <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted">
                    <div className="h-full bg-gradient-primary" style={{ width: `${(p.clicks / max) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-bold">{p.clicks}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
