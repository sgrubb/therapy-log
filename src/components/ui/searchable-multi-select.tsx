import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    } else {
      setSearch("");
    }
  }, [open]);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border-input bg-background ring-offset-background flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm shadow-xs"
      >
        <span className={value.length === 0 ? "text-muted-foreground" : ""}>
          {triggerLabel}
        </span>
        <ChevronDown size={14} className="text-muted-foreground ml-2 shrink-0" />
      </button>

      {open && (
        <div className="bg-popover border-border absolute z-50 mt-1 w-full rounded-md border shadow-md">
          <div className="p-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Search…"
              className="border-input bg-background w-full rounded border px-2 py-1 text-sm outline-none"
            />
          </div>
          <div className="max-h-52 overflow-auto">
            {filtered.map((opt) => {
              const checked = value.includes(opt.value);
              const disabled = !checked && maxSelections !== undefined && value.length >= maxSelections;
              return (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                    disabled ? "text-muted-foreground cursor-not-allowed opacity-50" : "hover:bg-accent"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(opt.value)}
                    className="shrink-0"
                  />
                  {opt.label}
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-muted-foreground px-3 py-2 text-sm">No results.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
