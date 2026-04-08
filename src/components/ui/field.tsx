import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function Field({
  label,
  error,
  conflictError,
  children,
  className,
}: {
  label: string;
  error?: string;
  conflictError?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {conflictError && <p className="text-yellow-700 text-sm">{conflictError}</p>}
    </div>
  );
}
