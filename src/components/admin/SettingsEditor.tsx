import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { User, BadgeCheck, Upload, FileText, Heart, Image as ImageIcon, Video } from "lucide-react";

interface Settings {
  id: string;
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

const STAT_META: Record<string, { label: string; icon: typeof FileText }> = {
  posts_count: { label: "Posts", icon: FileText },
  videos_count: { label: "Vídeos", icon: Video },
  photos_count: { label: "Fotos", icon: ImageIcon },
  likes_count: { label: "Curtidas", icon: Heart },
};

export const SettingsEditor = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("club_settings").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) setS(data as Settings);
    });
  }, []);

  const upload = async (file: File, field: "banner_url" | "avatar_url") => {
    const path = `${field}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("club-assets").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("club-assets").getPublicUrl(path);
    setS((prev) => prev ? { ...prev, [field]: data.publicUrl } : prev);
  };

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("club_settings").update({
      name: s.name, bio: s.bio, verified: s.verified,
      banner_url: s.banner_url, avatar_url: s.avatar_url,
      posts_count: s.posts_count, videos_count: s.videos_count,
      photos_count: s.photos_count, likes_count: s.likes_count,
    }).eq("id", s.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Salvo!");
  };

  if (!s) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-5">
      {/* Hero card with banner + avatar preview */}
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-admin-card shadow-admin">
        <div className="relative h-36 bg-muted">
          {s.banner_url ? (
            <img src={s.banner_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-admin-accent opacity-30" />
          )}
          <Label className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-1 rounded-md bg-card/80 px-3 py-2 text-xs font-medium text-card-foreground shadow-soft backdrop-blur transition-smooth hover:bg-card">
            <Upload className="h-3.5 w-3.5" />
            <span>Trocar banner</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "banner_url")} />
          </Label>
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-10 flex items-end gap-4">
            <div className="relative">
              {s.avatar_url ? (
                <img src={s.avatar_url} alt="" className="h-20 w-20 rounded-2xl border-4 border-card object-cover shadow-admin" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-card bg-muted shadow-admin">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <Label className="absolute -bottom-1 -right-1 cursor-pointer">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-admin-accent text-white shadow-admin-glow ring-2 ring-card">
                  <Upload className="h-3.5 w-3.5" />
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "avatar_url")} />
              </Label>
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold">{s.name || "Sem nome"}</span>
                {s.verified && <BadgeCheck className="h-4 w-4 fill-primary text-primary-foreground" />}
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">{s.bio || "Sem descrição"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-5 rounded-2xl border border-border bg-gradient-admin-card p-5 shadow-admin">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome do clube</Label>
          <Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} className="bg-card/50" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição / Bio</Label>
          <Textarea rows={3} value={s.bio || ""} onChange={(e) => setS({ ...s, bio: e.target.value })} className="bg-card/50" />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-card/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Selo de verificado</Label>
          </div>
          <Switch checked={s.verified} onCheckedChange={(v) => setS({ ...s, verified: v })} />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Estatísticas exibidas</Label>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["posts_count", "videos_count", "photos_count", "likes_count"] as const).map((f) => {
              const meta = STAT_META[f];
              const Icon = meta.icon;
              return (
                <div key={f} className="space-y-1.5 rounded-xl bg-card/40 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" /> {meta.label}
                  </div>
                  <Input type="number" min={0} value={s[f]} onChange={(e) => setS({ ...s, [f]: parseInt(e.target.value) || 0 })} className="h-9 bg-card/50 text-base font-bold" />
                </div>
              );
            })}
          </div>
        </div>

        <Button onClick={save} disabled={saving} size="lg" className="w-full bg-gradient-admin-accent shadow-admin-glow hover:opacity-90">
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
};
