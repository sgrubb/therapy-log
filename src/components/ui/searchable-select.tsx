import { useRef, useState } from "react";
import { Popover } from "radix-ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  onBlur?: () => void;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  className,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  onBlur,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedLabel = options.find((o) => o.value === value)?.label;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSearch("");
      onBlur?.();
    }
  }

  function select(v: string) {
    onValueChange(v);
    handleOpenChange(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          className={cn(
            "border-input bg-background flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm shadow-xs",
            ariaInvalid && "border-destructive",
            className,
          )}
        >
          <span className={!selectedLabel ? "text-muted-foreground" : ""}>
            {selectedLabel ?? placeholder}
          </span>
          {open
            ? <ChevronUp size={14} className="text-muted-foreground pointer-events-none ml-2 shrink-0" />
            : <ChevronDown size={14} className="text-muted-foreground pointer-events-none ml-2 shrink-0" />
          }
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
              placeholder="Search…"
              className="border-input bg-background w-full rounded border px-2 py-1 text-sm outline-none"
            />
          </div>
          <div className="max-h-52 overflow-auto">
            {filtered.map((opt) => (
              <div
                key={opt.value}
                onClick={() => select(opt.value)}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-accent${opt.value === value ? " bg-accent font-medium" : ""}`}
              >
                {opt.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-muted-foreground px-3 py-2 text-sm">No results.</p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
