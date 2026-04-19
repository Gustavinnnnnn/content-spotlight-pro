import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

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
    <div className="space-y-5 rounded-2xl bg-card p-5 shadow-card">
      <h2 className="text-lg font-bold">Perfil do Clube</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Banner</Label>
          {s.banner_url && <img src={s.banner_url} alt="" className="h-24 w-full rounded-lg object-cover" />}
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "banner_url")} />
        </div>
        <div className="space-y-1.5">
          <Label>Avatar / Logo</Label>
          {s.avatar_url && <img src={s.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover" />}
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "avatar_url")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
      </div>

      <div className="space-y-1.5">
        <Label>Descrição / Bio</Label>
        <Textarea rows={3} value={s.bio || ""} onChange={(e) => setS({ ...s, bio: e.target.value })} />
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={s.verified} onCheckedChange={(v) => setS({ ...s, verified: v })} />
        <Label>Mostrar selo de verificado</Label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["posts_count", "videos_count", "photos_count", "likes_count"] as const).map((f) => (
          <div key={f} className="space-y-1.5">
            <Label className="capitalize">{f.replace("_count", "")}</Label>
            <Input type="number" min={0} value={s[f]} onChange={(e) => setS({ ...s, [f]: parseInt(e.target.value) || 0 })} />
          </div>
        ))}
      </div>

      <Button onClick={save} disabled={saving} size="lg">{saving ? "Salvando..." : "Salvar alterações"}</Button>
    </div>
  );
};
