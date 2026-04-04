import * as React from "react";
import { cn } from "@/lib/utils";

export const BadgeVariant = {
  Open: "open",
  Closed: "closed",
} as const;
export type BadgeVariant = (typeof BadgeVariant)[keyof typeof BadgeVariant];

function Badge({
  className,
  variant = BadgeVariant.Open,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === BadgeVariant.Open && "bg-green-100 text-green-800",
        variant === BadgeVariant.Closed && "bg-gray-100 text-gray-600",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
