import { useRef, useState } from "react";
import { Checkbox, Popover } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface SearchableMultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
}

export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  maxSelections,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSearch("");
    }
  }

  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      if (maxSelections !== undefined && value.length >= maxSelections) {
        return;
      }
      onChange([...value, optionValue]);
    }
  }

  const triggerLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? placeholder)
        : `${value.length} selected`;

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="border-input bg-background ring-offset-background flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm shadow-xs"
        >
          <span className={value.length === 0 ? "text-muted-foreground" : ""}>
            {triggerLabel}
          </span>
          <ChevronDown size={14} className="text-muted-foreground ml-2 shrink-0" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          style={{ width: "var(--radix-popover-trigger-width)" }}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            searchRef.current?.focus();
          }}
          className="bg-popover border-border z-50 rounded-md border shadow-md"
        >
          <div className="p-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleOpenChange(false);
                }
              }}
              placeholder="Search…"
              className="border-input bg-background w-full rounded border px-2 py-1 text-sm outline-none"
            />
          </div>
          <div className="max-h-52 overflow-auto">
            {filtered.map((opt) => {
              const checked = value.includes(opt.value);
              const disabled =
                !checked && maxSelections !== undefined && value.length >= maxSelections;
              return (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                    disabled ? "text-muted-foreground cursor-not-allowed opacity-50" : "hover:bg-accent"
                  }`}
                >
                  <Checkbox.Root
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => toggle(opt.value)}
                    aria-label={opt.label}
                    className="border-input flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                  >
                    <Checkbox.Indicator>
                      <Check size={12} />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  {opt.label}
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-muted-foreground px-3 py-2 text-sm">No results.</p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
