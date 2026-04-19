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
    <div className="grid grid-cols-4 gap-2 rounded-2xl bg-card p-3 shadow-card">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex flex-col items-center justify-center rounded-xl py-2 text-center">
          <Icon className="mb-1 h-4 w-4 text-primary" />
          <div className="text-base font-extrabold text-foreground">{formatCount(value)}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
};
