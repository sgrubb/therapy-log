import { cn } from "@/lib/utils";

interface PageHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function PageHeader({ children, className }: PageHeaderProps) {
  return (
    <div className={cn("z-10 space-y-4 bg-background pb-2", className)}>
      {children}
    </div>
  );
}
