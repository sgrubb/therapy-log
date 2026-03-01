import type { ReactNode } from "react";

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <select value={value ?? ""} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  );
}

export function SelectTrigger() { return null; }
export function SelectValue() { return null; }
export function SelectSeparator() { return null; }
export function SelectScrollUpButton() { return null; }
export function SelectScrollDownButton() { return null; }

export function SelectContent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({ value, children }: { value: string; children: ReactNode }) {
  return <option value={value}>{children}</option>;
}

export function SelectLabel({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
