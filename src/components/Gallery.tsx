import { Image as ImageIcon, Lock, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: string;
  type: "photo" | "video";
  url: string;
  thumbnail_url?: string | null;
  title?: string | null;
  blurred?: boolean;
}

export const Gallery = ({ items }: { items: MediaItem[] }) => {
  if (!items.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
        <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/60" />
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma prévia disponível ainda.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {items.map((item) => {
        const src = item.thumbnail_url || item.url;
        return (
          <div
            key={item.id}
            className="group relative aspect-square overflow-hidden rounded-xl bg-muted shadow-soft"
          >
            <img
              src={src}
              alt={item.title || "Prévia"}
              loading="lazy"
              className={cn(
                "h-full w-full object-cover transition-smooth group-hover:scale-110",
                item.blurred && "blur-md scale-110"
              )}
            />
            {item.blurred && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary-deep/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-glow">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
              </div>
            )}
            {item.type === "video" && !item.blurred && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-glow">
                  <Play className="ml-0.5 h-5 w-5 fill-primary text-primary" />
                </div>
              </div>
            )}
            {item.type === "video" && (
              <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                VÍDEO
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
