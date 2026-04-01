import { useMemo } from "react";
import { useTherapist } from "@/context/TherapistContext";
import { SearchableSelect } from "@/components/ui/searchable-select";

export default function TherapistSelector() {
  const { therapists, selectedTherapistId, setSelectedTherapistId } = useTherapist();

  const options = useMemo(
    () => therapists.map((t) => ({ value: t.id.toString(), label: `${t.first_name} ${t.last_name}` })),
    [therapists],
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
