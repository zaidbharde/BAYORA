import type { ReactNode } from "react";

export interface DataTableColumn<TItem> {
  key: string;
  label: string;
  render: (item: TItem) => ReactNode;
  align?: "left" | "right";
}

interface DataTableProps<TItem> {
  columns: Array<DataTableColumn<TItem>>;
  rows: TItem[];
  emptyState: ReactNode;
  onRowClick?: (item: TItem) => void;
}

export const DataTable = <TItem,>({ columns, rows, emptyState, onRowClick }: DataTableProps<TItem>) => {
  if (!rows.length) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto rounded border border-bayora-border">
      <table className="min-w-full divide-y divide-bayora-border">
        <thead className="bg-black/20">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 text-left text-xs uppercase tracking-[0.2em] text-slate-500 ${column.align === "right" ? "text-right" : ""}`.trim()}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-bayora-border bg-[#0D1420]">
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`transition ${onRowClick ? "cursor-pointer hover:bg-white/5" : ""}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 text-sm text-slate-300 ${column.align === "right" ? "text-right" : ""}`.trim()}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
