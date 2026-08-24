import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SfCard({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-[20px] border border-white/[0.06] bg-[hsl(var(--sf-card))] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_12px_32px_-16px_rgba(0,0,0,0.7)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SfCardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4 gap-3">
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
