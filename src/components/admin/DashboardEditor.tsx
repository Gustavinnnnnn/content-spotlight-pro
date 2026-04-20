import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, MousePointerClick, ShoppingCart, TrendingUp, Loader2 } from "lucide-react";

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

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando dashboard...</div>;

  const cards = [
    { icon: Eye, label: "Visitas (30d)", value: views, tint: "from-sky-500/20 to-sky-500/0", icon_tint: "bg-sky-500/15 text-sky-300" },
    { icon: MousePointerClick, label: "Cliques nos planos", value: clicks, tint: "from-violet-500/20 to-violet-500/0", icon_tint: "bg-violet-500/15 text-violet-300" },
    { icon: ShoppingCart, label: "Compras", value: purchases, tint: "from-emerald-500/20 to-emerald-500/0", icon_tint: "bg-emerald-500/15 text-emerald-300" },
    { icon: TrendingUp, label: "Taxa conversão", value: `${ctr}%`, tint: "from-orange-500/25 to-orange-500/0", icon_tint: "bg-orange-500/15 text-orange-300" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className="relative overflow-hidden rounded-2xl border border-border bg-gradient-admin-card p-4 shadow-admin">
            <div className={`absolute inset-0 bg-gradient-to-br ${c.tint} opacity-60`} />
            <div className="relative">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.icon_tint}`}>
                <c.icon className="h-4 w-4" />
              </div>
              <div className="mt-3 text-2xl font-extrabold tracking-tight">{c.value}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-gradient-admin-card p-5 shadow-admin">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold">Últimos 7 dias</h3>
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-primary/40" /> Visitas</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-gradient-admin-accent" /> Cliques</span>
          </div>
        </div>
        <div className="flex h-44 items-end gap-2">
          {days.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end gap-1">
                <div className="flex-1 rounded-t-md bg-primary/30 transition-smooth hover:bg-primary/50" style={{ height: `${(d.views / maxBar) * 100}%` }} title={`${d.views} visitas`} />
                <div className="flex-1 rounded-t-md bg-gradient-admin-accent shadow-admin-glow" style={{ height: `${(d.clicks / maxBar) * 100}%` }} title={`${d.clicks} cliques`} />
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-gradient-admin-card p-5 shadow-admin">
        <h3 className="mb-4 text-sm font-bold">Cliques por plano (30d)</h3>
        {planClicks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {planClicks.map(p => {
              const max = Math.max(1, ...planClicks.map(x => x.clicks));
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-28 truncate text-xs font-medium">{p.name}</span>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-muted">
                    <div className="h-full bg-gradient-admin-accent transition-all" style={{ width: `${(p.clicks / max) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-bold tabular-nums">{p.clicks}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
