import * as React from "react";
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

export const PlanButton = React.forwardRef<HTMLButtonElement, PlanButtonProps>(
  ({ name, priceLabel, description, color, highlighted, badge, onClick }, ref) => {
    const accent = color || "hsl(var(--primary))";

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
          "group relative overflow-hidden rounded-2xl border px-4 py-4 text-center transition-bounce hover:-translate-y-0.5",
          highlighted
            ? "border-transparent text-white shadow-warm-glow animate-shine"
            : "border-border/60 bg-card/60 text-foreground shadow-card hover:border-primary/60 hover:shadow-warm-glow backdrop-blur-warm",
        )}
        style={highlighted ? { background: `linear-gradient(135deg, ${accent}, hsl(var(--primary-deep)))` } : undefined}
      >
        {badge && (
          <span
            className={cn(
              "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
              highlighted ? "bg-white/25 text-white backdrop-blur-sm" : "bg-primary text-primary-foreground",
            )}
          >
            {badge}
          </span>
        )}
        <div className={cn("text-[10px] font-bold uppercase tracking-[0.16em]", highlighted ? "text-white/85" : "text-muted-foreground")}>
          {name}
        </div>
        <div className="mt-1.5 font-display text-xl font-bold leading-tight">{priceLabel}</div>
        {description && (
          <div className={cn("mt-1 line-clamp-2 text-[10px] leading-tight", highlighted ? "text-white/80" : "text-muted-foreground")}>
            {description}
          </div>
        )}
      </button>
    );
  },
);

PlanButton.displayName = "PlanButton";
