import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Upload } from "lucide-react";
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

  return (
    <div className="space-y-4 rounded-2xl bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Galeria</h2>
        <Label className="cursor-pointer">
          <Button asChild size="sm" disabled={uploading}>
            <span><Upload className="mr-1 h-4 w-4" />{uploading ? "Enviando..." : "Adicionar foto/vídeo"}</span>
          </Button>
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="space-y-2 rounded-xl border-2 border-border p-2">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              {item.type === "video" ? (
                <video src={item.url} className="h-full w-full object-cover" />
              ) : (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
              <span className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                {item.type}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Switch checked={item.blurred} onCheckedChange={(v) => toggleBlur(item.id, v)} />
                <span className="text-[11px]">Blur</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      {!items.length && <p className="text-center text-sm text-muted-foreground">Nenhuma mídia ainda.</p>}
    </div>
  );
};
