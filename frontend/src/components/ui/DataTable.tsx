"use client";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  page?: number;
  totalPages?: number;
  onPage?: (page: number) => void;
  emptyMessage?: string;
  rowKey: (row: T) => string | number;
}

export default function DataTable<T>({
  columns,
  data,
  sortKey,
  sortDir,
  onSort,
  page = 1,
  totalPages = 1,
  onPage,
  emptyMessage = "No data available",
  rowKey,
}: DataTableProps<T>) {
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface)" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-4 py-3 font-medium text-xs uppercase tracking-wide select-none ${
                    col.sortable ? "cursor-pointer hover:text-accent transition-colors" : ""
                  }`}
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="opacity-60">
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )
                        ) : (
                          <ChevronsUpDown size={12} />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-12"
                  style={{ color: "var(--text-muted)" }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={rowKey(row)}
                  style={{
                    backgroundColor: idx % 2 === 1 ? "rgba(255,255,255,0.03)" : "transparent",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                      {col.render
                        ? col.render(row)
                        : (row as Record<string, unknown>)[col.key] != null
                        ? String((row as Record<string, unknown>)[col.key])
                        : "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => onPage?.(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 rounded border disabled:opacity-40 transition-colors hover:border-accent"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)", backgroundColor: "var(--bg-card)" }}
            >
              ← Prev
            </button>
            <button
              onClick={() => onPage?.(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded border disabled:opacity-40 transition-colors hover:border-accent"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)", backgroundColor: "var(--bg-card)" }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
