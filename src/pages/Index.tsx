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
    // log a page view (one per session)
    if (!sessionStorage.getItem("v_logged")) {
      supabase.from("site_events").insert({ event_type: "view" }).then(() => {
        sessionStorage.setItem("v_logged", "1");
      });
    }
  }, []);

  const banner = settings?.banner_url || defaultBanner;
  const avatar = settings?.avatar_url || defaultAvatar;

  const handlePlanClick = async (plan: Plan) => {
    await supabase.from("site_events").insert({ event_type: "plan_click", plan_id: plan.id });
    if (plan.checkout_url) window.open(plan.checkout_url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gradient-warm pb-12">
      {/* Banner */}
      <header className="relative">
        <div className="relative h-44 w-full overflow-hidden sm:h-60">
          <img src={banner} alt="Banner" className="h-full w-full object-cover object-center" />
        </div>
        <Link
          to="/admin"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-primary shadow-card backdrop-blur-sm transition-smooth hover:scale-105"
          aria-label="Painel admin"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </header>

      <main className="relative z-10 mx-auto -mt-9 max-w-md px-4 sm:-mt-11">
        {/* Avatar + Name */}
        <section className="relative z-10 flex flex-col items-center text-center">
          <div className="rounded-full bg-background p-1.5 shadow-card">
            <div className="rounded-full bg-gradient-primary p-1 shadow-glow">
              <img
                src={avatar}
                alt={settings?.name || "Avatar"}
                className="h-24 w-24 rounded-full border-4 border-background object-cover sm:h-28 sm:w-28"
              />
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5">
            <h1 className="text-xl font-extrabold text-foreground">
              {settings?.name || "Carregando..."}
            </h1>
            {settings?.verified && (
              <BadgeCheck className="h-5 w-5 fill-primary text-primary-foreground" aria-label="Verificado" />
            )}
          </div>

          {settings?.bio && (
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">{settings.bio}</p>
          )}
        </section>

        {/* Plans — compactos */}
        <section className="mt-5 grid grid-cols-2 gap-2.5">
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
        <section className="mt-5">
          <Stats
            posts={settings?.posts_count ?? 0}
            videos={settings?.videos_count ?? 0}
            photos={settings?.photos_count ?? 0}
            likes={settings?.likes_count ?? 0}
          />
        </section>

        {/* Gallery */}
        <section className="mt-5">
          <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Galeria
          </h2>
          <Gallery items={media} />
        </section>
      </main>
    </div>
  );
};

export default Index;
