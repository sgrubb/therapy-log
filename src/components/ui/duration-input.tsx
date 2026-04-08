import { cn } from "@/lib/utils";

export type Duration = { hours: number; minutes: number };

const selectClass =
  "border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive h-9 rounded-md border px-2 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50";

interface DurationInputProps {
  value: Duration;
  onChange: (value: Duration) => void;
  onBlur?: () => void;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}

export function DurationInput({
  value,
  onChange,
  onBlur,
  className,
  ...props
}: DurationInputProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} onBlur={onBlur}>
      <select
        value={value.hours}
        onChange={(e) => onChange({ hours: Number(e.target.value), minutes: value.minutes })}
        className={selectClass}
        aria-label="Hours"
        {...props}
      >
        {Array.from({ length: 7 }, (_, i) => (
          <option key={i} value={i}>
            {i}h
          </option>
        ))}
      </select>
      <select
        value={value.minutes}
        onChange={(e) => onChange({ hours: value.hours, minutes: Number(e.target.value) })}
        className={selectClass}
        aria-label="Minutes"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={i * 5}>
            {String(i * 5).padStart(2, "0")}m
          </option>
        ))}
      </select>
    </div>
  );
}
