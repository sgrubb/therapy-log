import { useTherapists } from "@/context/TherapistContext";
import { TherapistStatus } from "@shared/types/enums";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TherapistFilters() {
  const { status, setStatus } = useTherapists();

  function reset() {
    setStatus(TherapistStatus.Active);
  }

  return (
    <FilterToolbar onReset={reset}>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Status</span>
        <Select value={status} onValueChange={(v) => setStatus(v as TherapistStatus)}>
          <SelectTrigger className="w-36" aria-label="Status filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TherapistStatus.Active}>Active</SelectItem>
            <SelectItem value={TherapistStatus.Inactive}>Inactive</SelectItem>
            <SelectItem value={TherapistStatus.All}>All</SelectItem>
          </SelectContent>
        </Select>
      </label>
    </FilterToolbar>
  );
}
