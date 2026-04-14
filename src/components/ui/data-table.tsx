import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortDir } from "@shared/types/enums";

export interface Column<T> {
  key: string;
  label: string;
  className?: string;
  sortable?: boolean;
  render: (row: T) => React.ReactNode;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  keyFn: (row: T) => string | number;
  sortKey?: string;
  sortDir?: SortDir;
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyFn,
  sortKey,
  sortDir = SortDir.Asc,
  onSort,
  onRowClick,
  emptyMessage = "No results found.",
}: Props<T>) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-muted text-muted-foreground border-b text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-2 font-medium",
                  col.sortable && onSort && "hover:text-foreground cursor-pointer select-none",
                  col.className,
                )}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
              >
                {col.label}
                {col.sortable && sortKey === col.key && (
                  sortDir === SortDir.Asc
                    ? <ArrowUp size={12} className="ml-1 inline" />
                    : <ArrowDown size={12} className="ml-1 inline" />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyFn(row)}
              className={cn(
                "border-b transition-colors",
                onRowClick && "hover:bg-muted/50 cursor-pointer",
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-3 py-2", col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-muted-foreground py-6 text-center">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
