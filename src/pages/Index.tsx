import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Gallery } from "@/components/Gallery";
import { PlanButton } from "@/components/PlanButton";
import { Stats } from "@/components/Stats";
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

  useEffect(() => {
    const load = async () => {
      const [s, p, m] = await Promise.all([
        supabase.from("club_settings").select("*").limit(1).maybeSingle(),
        supabase.from("plans").select("*").eq("active", true).order("sort_order"),
        supabase.from("media_items").select("*").order("sort_order").order("created_at", { ascending: false }),
      ]);
      if (s.data) setSettings(s.data as ClubSettings);
      if (p.data) setPlans(p.data as Plan[]);
      if (m.data) setMedia(m.data as MediaItem[]);
    };
    load();
  }, []);

  const banner = settings?.banner_url || defaultBanner;
  const avatar = settings?.avatar_url || defaultAvatar;

  const handlePlanClick = (plan: Plan) => {
    if (plan.checkout_url) window.open(plan.checkout_url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gradient-warm pb-16">
      {/* Banner */}
      <header className="relative">
        <div className="relative h-44 w-full overflow-hidden sm:h-56 md:h-64">
          <img src={banner} alt="Banner" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
        </div>
        <Link
          to="/admin"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-primary shadow-card backdrop-blur-sm transition-smooth hover:scale-105"
          aria-label="Painel admin"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      <main className="mx-auto -mt-14 max-w-xl px-4">
        {/* Avatar + Name */}
        <section className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="rounded-full bg-gradient-primary p-1 shadow-glow">
              <img
                src={avatar}
                alt={settings?.name || "Avatar"}
                className="h-24 w-24 rounded-full border-4 border-background object-cover sm:h-28 sm:w-28"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">
              {settings?.name || "Carregando..."}
            </h1>
            {settings?.verified && (
              <BadgeCheck className="h-6 w-6 fill-primary text-primary-foreground" aria-label="Verificado" />
            )}
          </div>

          {settings?.bio && (
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{settings.bio}</p>
          )}
        </section>

        {/* Plans */}
        <section className="mt-8 space-y-3">
          <h2 className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Escolha seu plano
          </h2>
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
        </section>

        {/* Stats */}
        <section className="mt-10">
          <Stats
            posts={settings?.posts_count ?? 0}
            videos={settings?.videos_count ?? 0}
            photos={settings?.photos_count ?? 0}
            likes={settings?.likes_count ?? 0}
          />
        </section>

        {/* Gallery */}
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Galeria — Prévias
          </h2>
          <Gallery items={media} />
        </section>
      </main>
    </div>
  );
};

export default Index;
