import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlanButtonProps {
  name: string;
  priceLabel: string;
  description?: string | null;
  color?: string;
  highlighted?: boolean;
  badge?: string | null;
  onClick?: () => void;
}

export const PlanButton = ({ name, priceLabel, description, color, highlighted, badge, onClick }: PlanButtonProps) => {
  const accent = color || "hsl(var(--primary))";
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border-2 p-5 text-left transition-smooth hover:scale-[1.02]",
        highlighted
          ? "border-transparent text-primary-foreground shadow-glow"
          : "border-border bg-card text-foreground hover:border-primary/40 shadow-card hover:shadow-glow"
      )}
      style={highlighted ? { background: `linear-gradient(135deg, ${accent}, hsl(var(--primary-deep)))` } : undefined}
    >
      {badge && (
        <span
          className={cn(
            "absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            highlighted ? "bg-white/25 text-white backdrop-blur-sm" : "bg-primary text-primary-foreground"
          )}
        >
          {badge}
        </span>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className={cn("text-sm font-semibold uppercase tracking-wider", highlighted ? "text-white/80" : "text-muted-foreground")}>
            {name}
          </div>
          <div className="mt-1 text-2xl font-extrabold leading-tight">{priceLabel}</div>
          {description && (
            <div className={cn("mt-1 text-xs", highlighted ? "text-white/85" : "text-muted-foreground")}>
              {description}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold transition-smooth group-hover:translate-x-1",
            highlighted ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
          )}
          aria-hidden
        >
          →
        </div>
      </div>
    </button>
  );
};
