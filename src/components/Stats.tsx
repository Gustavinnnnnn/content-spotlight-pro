import { Heart, Image as ImageIcon, Layers, Play } from "lucide-react";

interface StatsProps {
  posts: number;
  videos: number;
  photos: number;
  likes: number;
}

const formatCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

export const Stats = ({ posts, videos, photos, likes }: StatsProps) => {
  const items = [
    { icon: Layers, label: "Posts", value: posts },
    { icon: Play, label: "Vídeos", value: videos },
    { icon: ImageIcon, label: "Fotos", value: photos },
    { icon: Heart, label: "Likes", value: likes },
  ];
  return (
    <div className="grid grid-cols-4 gap-1 rounded-2xl border border-border/60 bg-card/50 p-3 shadow-card backdrop-blur-warm">
      {items.map(({ icon: Icon, label, value }, i) => (
        <div key={label} className="relative flex flex-col items-center justify-center rounded-xl py-1.5 text-center">
          {i > 0 && <span className="absolute -left-px top-2 bottom-2 w-px bg-border/50" />}
          <Icon className="mb-1 h-4 w-4 text-primary" strokeWidth={2.4} />
          <div className="font-display text-lg font-bold leading-none text-foreground">{formatCount(value)}</div>
          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
};
