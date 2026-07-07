import { useEffect, useState } from "react";
import { BadgeCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Gallery } from "@/components/Gallery";
import { PlanButton } from "@/components/PlanButton";
import { Stats } from "@/components/Stats";
import { PixCheckoutDialog } from "@/components/PixCheckoutDialog";
import defaultBanner from "@/assets/default-banner.jpg";
import defaultAvatar from "@/assets/default-avatar.jpg";

interface ClubSettings {
  name: string;
  bio: string | null;
  verified: boolean;
  banner_url: string | null;
  avatar_url: string | null;
  posts_count: number;
  videos_count: number;
  photos_count: number;
  likes_count: number;
}

interface Plan {
  id: string;
  name: string;
  price_label: string;
  description: string | null;
  checkout_url: string | null;
  color: string;
  highlighted: boolean;
  badge: string | null;
}

interface MediaItem {
  id: string;
  type: "photo" | "video";
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  blurred: boolean;
}

const Index = () => {
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string>(defaultAvatar);

  useEffect(() => {
    const load = async () => {
      const [s, p, m] = await Promise.all([
        supabase.from("club_settings").select("*").limit(1).maybeSingle(),
        supabase.from("plans").select("*").eq("active", true).order("sort_order"),
        supabase.from("media_items").select("*").order("sort_order").order("created_at", { ascending: false }),
      ]);
      if (s.data) {
        setSettings(s.data as ClubSettings);
        if ((s.data as ClubSettings).avatar_url) {
          setAvatarSrc((s.data as ClubSettings).avatar_url as string);
        }
      }
      if (p.data) setPlans(p.data as Plan[]);
      if (m.data) setMedia(m.data as MediaItem[]);
    };
    load();
    if (!sessionStorage.getItem("v_logged")) {
      supabase.from("site_events").insert({ event_type: "view" }).then(() => {
        sessionStorage.setItem("v_logged", "1");
      });
    }
  }, []);

  const banner = settings?.banner_url || defaultBanner;

  const handlePlanClick = async (plan: Plan) => {
    await supabase.from("site_events").insert({ event_type: "plan_click", plan_id: plan.id });
    if (plan.checkout_url) {
      window.open(plan.checkout_url, "_blank", "noopener,noreferrer");
    } else {
      setSelectedPlan(plan);
      setCheckoutOpen(true);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-16">
      {/* Warm ambient glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[380px] bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,hsl(20_91%_54%/0.28),transparent_70%)]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,hsl(32_100%_62%/0.12),transparent_70%)] blur-3xl" />

      {/* Banner */}
      <header className="relative">
        <div className="relative h-52 w-full overflow-hidden sm:h-72">
          <img
            src={banner}
            alt="Banner"
            className="h-full w-full object-cover object-center"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultBanner; }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary-deep/25 mix-blend-overlay" />
          {/* Grain overlay */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }} />
        </div>
      </header>

      <main className="relative z-10 mx-auto -mt-16 max-w-md px-5 sm:-mt-20">
        {/* Avatar */}
        <section className="flex flex-col items-center text-center">
          <div className="relative">
            {/* animated ring */}
            <div className="absolute -inset-1.5 rounded-full bg-gradient-warm-hero opacity-90 blur-[2px]" />
            <div className="relative rounded-full bg-background p-1">
              <div className="rounded-full bg-gradient-warm-hero p-[3px] shadow-warm-glow">
                <img
                  src={avatarSrc}
                  alt={settings?.name || "Avatar"}
                  loading="eager"
                  onError={() => setAvatarSrc(defaultAvatar)}
                  className="h-28 w-28 rounded-full border-[3px] border-background object-cover sm:h-32 sm:w-32"
                />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-warm-hero shadow-warm-glow ring-4 ring-background">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <h1 className="font-display text-[26px] font-bold leading-none tracking-tight text-foreground sm:text-3xl">
              {settings?.name || "Carregando..."}
            </h1>
            {settings?.verified && (
              <BadgeCheck className="h-6 w-6 fill-primary text-primary-foreground" aria-label="Verificado" />
            )}
          </div>

          {settings?.bio && (
            <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
              {settings.bio}
            </p>
          )}

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 backdrop-blur-warm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Online agora</span>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-6">
          <Stats
            posts={settings?.posts_count ?? 0}
            videos={settings?.videos_count ?? 0}
            photos={settings?.photos_count ?? 0}
            likes={settings?.likes_count ?? 0}
          />
        </section>

        {/* Plans */}
        <section className="mt-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">Escolha seu acesso</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">VIP</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {plans.map((plan) => (
              <PlanButton
                key={plan.id}
                name={plan.name}
                priceLabel={plan.price_label}
                description={plan.description}
                color={plan.color}
                highlighted={plan.highlighted}
                badge={plan.badge}
                onClick={() => handlePlanClick(plan)}
              />
            ))}
          </div>
        </section>

        {/* Gallery */}
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">Prévias</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Galeria</span>
          </div>
          <Gallery items={media} />
        </section>

        <footer className="mt-10 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground/60">
            Conteúdo exclusivo · +18
          </p>
        </footer>
      </main>

      <PixCheckoutDialog plan={selectedPlan} open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </div>
  );
};

export default Index;
