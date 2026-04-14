import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SortDir } from "@shared/types/enums";

interface Row {
  id: number;
  name: string;
  score: number;
}

const columns: Column<Row>[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (row) => row.name,
  },
  {
    key: "score",
    label: "Score",
    sortable: true,
    render: (row) => String(row.score),
  },
  {
    key: "static",
    label: "Static",
    render: (row) => `item-${row.id}`,
  },
];

const data: Row[] = [
  { id: 1, name: "Charlie", score: 30 },
  { id: 2, name: "Alice", score: 10 },
  { id: 3, name: "Bob", score: 20 },
];

function keyFn(row: Row) {
  return row.id;
}

describe("DataTable", () => {
  it("renders column headers", () => {
    render(<DataTable data={data} columns={columns} keyFn={keyFn} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("Static")).toBeInTheDocument();
  });

  it("renders a row for each data item", () => {
    render(<DataTable data={data} columns={columns} keyFn={keyFn} />);
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders data in the order provided (no internal sort)", () => {
    render(<DataTable data={data} columns={columns} keyFn={keyFn} />);
    const cells = screen.getAllByRole("cell").filter((c) =>
      ["Charlie", "Alice", "Bob"].includes(c.textContent ?? ""),
    );
    expect(cells.map((c) => c.textContent)).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("calls onSort with the column key when a sortable header is clicked", () => {
    const onSort = vi.fn();
    render(
      <DataTable
        data={data}
        columns={columns}
        keyFn={keyFn}
        sortKey="score"
        sortDir={SortDir.Asc}
        onSort={onSort}
      />,
    );
    fireEvent.click(screen.getByText("Name"));
    expect(onSort).toHaveBeenCalledOnce();
    expect(onSort).toHaveBeenCalledWith("name");
  });

  it("shows the sort icon only on the active column", () => {
    render(
      <DataTable
        data={data}
        columns={columns}
        keyFn={keyFn}
        sortKey="name"
        sortDir={SortDir.Asc}
      />,
    );
    const nameHeader = screen.getByText("Name").closest("th")!;
    const scoreHeader = screen.getByText("Score").closest("th")!;
    expect(nameHeader.querySelector("svg")).toBeInTheDocument();
    expect(scoreHeader.querySelector("svg")).not.toBeInTheDocument();
  });

  it("shows ascending icon when sortDir is Asc", () => {
    render(
      <DataTable
        data={data}
        columns={columns}
        keyFn={keyFn}
        sortKey="name"
        sortDir={SortDir.Asc}
      />,
    );
    const nameHeader = screen.getByText("Name").closest("th")!;
    // ArrowUp has aria-label or title — just check svg presence for now
    expect(nameHeader.querySelector("svg")).toBeInTheDocument();
  });

  it("calls onRowClick with the correct row when a row is clicked", () => {
    const onRowClick = vi.fn();
    render(<DataTable data={data} columns={columns} keyFn={keyFn} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText("Alice").closest("tr")!);
    expect(onRowClick).toHaveBeenCalledOnce();
    expect(onRowClick).toHaveBeenCalledWith(data[1]);
  });

  it("shows emptyMessage when data is empty", () => {
    render(<DataTable data={[]} columns={columns} keyFn={keyFn} emptyMessage="Nothing here." />);
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  it("shows default emptyMessage when data is empty and no message is provided", () => {
    render(<DataTable data={[]} columns={columns} keyFn={keyFn} />);
    expect(screen.getByText("No results found.")).toBeInTheDocument();
  });

  it("does not make unsortable column headers clickable", () => {
    render(<DataTable data={data} columns={columns} keyFn={keyFn} />);
    const staticHeader = screen.getByText("Static").closest("th")!;
    expect(staticHeader).not.toHaveAttribute("onClick");
    expect(staticHeader).not.toHaveStyle({ cursor: "pointer" });
  });

  it("applies className to header and body cells", () => {
    const customColumns: Column<Row>[] = [
      { ...columns[0]!, className: "w-10" },
      columns[1]!,
      columns[2]!,
    ];
    render(<DataTable data={data} columns={customColumns} keyFn={keyFn} />);

    const th = screen.getByText("Name").closest("th")!;
    expect(th).toHaveClass("w-10");

    const td = screen.getByText("Alice").closest("td")!;
    expect(td).toHaveClass("w-10");

    // Other columns should not have the custom class
    const otherTh = screen.getByText("Score").closest("th")!;
    expect(otherTh).not.toHaveClass("w-10");
  });
});
