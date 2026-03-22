export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  onBlur,
}: {
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  onBlur?: () => void;
}) {
  return (
    <select
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid ?? undefined}
      value={value ?? ""}
      onChange={(e) => {
        onValueChange(e.target.value);
        onBlur?.();
      }}
      onBlur={onBlur}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
