import { Button } from "@/components/ui/button";

interface FilterToolbarProps {
  onReset: () => void;
  children: React.ReactNode;
}

export function FilterToolbar({ onReset, children }: FilterToolbarProps) {
  return (
    <div className="relative flex flex-wrap items-end gap-3 pr-32">
      {children}
      <Button
        variant="outline"
        onClick={onReset}
        className="absolute right-0 top-0"
      >
        Reset Filters
      </Button>
    </div>
  );
}
