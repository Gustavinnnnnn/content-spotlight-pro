import { Image as ImageIcon, Lock, Play, Heart } from "lucide-react";
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
      <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-10 text-center">
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
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-muted shadow-soft ring-1 ring-border/40 transition-smooth hover:shadow-glow hover:ring-primary/40"
          >
            {item.type === "video" ? (
              <video
                src={item.url}
                muted
                loop
                playsInline
                autoPlay={!item.blurred}
                preload="metadata"
                className={cn(
                  "h-full w-full object-cover transition-smooth duration-500 group-hover:scale-110",
                  item.blurred && "scale-110 blur-lg"
                )}
              />
            ) : (
              <img
                src={src}
                alt={item.title || "Prévia"}
                loading="lazy"
                className={cn(
                  "h-full w-full object-cover transition-smooth duration-500 group-hover:scale-110",
                  item.blurred && "scale-110 blur-lg"
                )}
              />
            )}

            {/* Overlay degradê inferior para legibilidade */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80" />

            {item.blurred && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/40 to-primary-deep/50 backdrop-blur-[1px]">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-glow ring-2 ring-white/40">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <span className="mt-1.5 rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                  Exclusivo
                </span>
              </div>
            )}

            {item.type === "video" && !item.blurred && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 shadow-glow ring-2 ring-white/30 transition-smooth group-hover:scale-110">
                  <Play className="ml-0.5 h-5 w-5 fill-primary text-primary" />
                </div>
              </div>
            )}

            {item.type === "video" && (
              <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                <Play className="h-2.5 w-2.5 fill-white" />
                Vídeo
              </span>
            )}

            {!item.blurred && (
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 text-white/90 opacity-0 transition-smooth group-hover:opacity-100">
                <Heart className="h-3 w-3 fill-white/90" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
