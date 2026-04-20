import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Upload, Image as ImageIcon, Play } from "lucide-react";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  type: "photo" | "video";
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  blurred: boolean;
  sort_order: number;
}

export const GalleryEditor = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("media_items").select("*").order("sort_order").order("created_at", { ascending: false });
    if (data) setItems(data as MediaItem[]);
  };
  useEffect(() => { load(); }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const isVideo = file.type.startsWith("video/");
    const path = `${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("gallery").upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data } = supabase.storage.from("gallery").getPublicUrl(path);
    const { error } = await supabase.from("media_items").insert({
      type: isVideo ? "video" : "photo",
      url: data.publicUrl,
      thumbnail_url: isVideo ? null : data.publicUrl,
      blurred: true,
      sort_order: items.length,
    });
    setUploading(false);
    if (error) toast.error(error.message); else { toast.success("Mídia adicionada"); load(); }
  };

  const toggleBlur = async (id: string, blurred: boolean) => {
    const { error } = await supabase.from("media_items").update({ blurred }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta mídia?")) return;
    const { error } = await supabase.from("media_items").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removida"); load(); }
  };

  const photos = items.filter(i => i.type === "photo").length;
  const videos = items.filter(i => i.type === "video").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-gradient-admin-card p-4 shadow-admin">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-admin-accent shadow-admin-glow">
            <ImageIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">Galeria</h2>
            <p className="text-xs text-muted-foreground">{photos} foto(s) · {videos} vídeo(s)</p>
          </div>
        </div>
        <Label className="cursor-pointer">
          <Button asChild size="sm" disabled={uploading} className="bg-gradient-admin-accent shadow-admin-glow hover:opacity-90">
            <span><Upload className="mr-1 h-4 w-4" />{uploading ? "Enviando..." : "Adicionar"}</span>
          </Button>
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </Label>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
          <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma mídia ainda. Adicione fotos e vídeos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="group overflow-hidden rounded-2xl border border-border bg-gradient-admin-card shadow-admin transition-smooth hover:border-primary/30">
              <div className="relative aspect-square overflow-hidden bg-muted">
                {item.type === "video" ? (
                  <>
                    <video src={item.url} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-8 w-8 text-white drop-shadow-lg" fill="currentColor" />
                    </div>
                  </>
                ) : (
                  <img src={item.url} alt="" className="h-full w-full object-cover transition-smooth group-hover:scale-105" />
                )}
                <span className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                  {item.type === "video" ? "Vídeo" : "Foto"}
                </span>
                {item.blurred && (
                  <span className="absolute left-2 top-2 rounded-md bg-primary/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground backdrop-blur">
                    Blur
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-2.5">
                <div className="flex items-center gap-1.5">
                  <Switch checked={item.blurred} onCheckedChange={(v) => toggleBlur(item.id, v)} />
                  <span className="text-[11px] font-medium">Blur</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => remove(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
