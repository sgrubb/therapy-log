import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "open" | "closed";

function Badge({
  className,
  variant = "open",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "open" && "bg-green-100 text-green-800",
        variant === "closed" && "bg-gray-100 text-gray-600",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
