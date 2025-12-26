import { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b bg-background/50 backdrop-blur-sm px-6 py-4",
        className
      )}
    >
      <div className="space-y-1">
        {typeof title === "string" ? (
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        ) : (
          <div className="text-2xl font-semibold tracking-tight">{title}</div>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
