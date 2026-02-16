import { useTherapist } from "@/context/TherapistContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TherapistSelector() {
  const { therapists, selectedTherapistId, setSelectedTherapistId } =
    useTherapist();

  return (
    <Select
      value={selectedTherapistId?.toString() ?? ""}
      onValueChange={(value) => setSelectedTherapistId(Number(value))}
    >
      <SelectTrigger className="w-52">
        <SelectValue placeholder="Select therapist" />
      </SelectTrigger>
      <SelectContent>
        {therapists.map((t) => (
          <SelectItem key={t.id} value={t.id.toString()}>
            {t.first_name} {t.last_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
