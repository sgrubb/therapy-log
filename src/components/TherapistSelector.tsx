import { useMemo } from "react";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { SearchableSelect } from "@/components/ui/searchable-select";

export default function TherapistSelector() {
  const { activeTherapists, selectedTherapistId, setSelectedTherapistId } = useSelectedTherapist();

  const options = useMemo(
    () => activeTherapists.map((t) => ({ value: t.id.toString(), label: `${t.first_name} ${t.last_name}` })),
    [activeTherapists],
  );

  return (
    <SearchableSelect
      options={options}
      value={selectedTherapistId?.toString() ?? ""}
      onValueChange={(value) => setSelectedTherapistId(Number(value))}
      placeholder="Select therapist"
      className="w-52"
    />
  );
}
