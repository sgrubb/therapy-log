import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterToolbarProps {
  onReset: () => void;
  children: React.ReactNode;
}

export function FilterToolbar({ onReset, children }: FilterToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {children}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="ml-8 shrink-0"
      >
        <FilterX className="size-4" />
        Reset Filters
      </Button>
    </div>
  );
}
