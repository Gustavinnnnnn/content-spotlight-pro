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
  ({ name, priceLabel, color, highlighted, badge, onClick }, ref) => {
    const accent = color || "hsl(var(--primary))";

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
          "group relative overflow-hidden rounded-2xl border-2 px-3 py-3.5 text-center transition-smooth hover:scale-[1.03]",
          highlighted
            ? "border-transparent text-primary-foreground shadow-glow"
            : "border-border bg-card text-foreground shadow-card hover:border-primary/40"
        )}
        style={highlighted ? { background: `linear-gradient(135deg, ${accent}, hsl(var(--primary-deep)))` } : undefined}
      >
        {badge && (
          <span
            className={cn(
              "absolute -top-px left-1/2 -translate-x-1/2 rounded-b-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
              highlighted ? "bg-white/25 text-white backdrop-blur-sm" : "bg-primary text-primary-foreground"
            )}
          >
            {badge}
          </span>
        )}
        <div className={cn("text-[10px] font-bold uppercase tracking-wider", highlighted ? "text-white/80" : "text-muted-foreground")}>
          {name}
        </div>
        <div className="mt-1 text-base font-extrabold leading-tight">{priceLabel}</div>
      </button>
    );
  }
);

PlanButton.displayName = "PlanButton";
