import { Label } from "@/components/ui/label";

export function Field({
  label,
  error,
  conflictError,
  children,
}: {
  label: string;
  error?: string;
  conflictError?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {conflictError && <p className="text-yellow-700 text-sm">{conflictError}</p>}
    </div>
  );
}
