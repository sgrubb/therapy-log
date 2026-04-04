import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTable, type Column } from "@/components/ui/data-table";

interface Row {
  id: number;
  name: string;
  score: number;
}

const columns: Column<Row>[] = [
  {
    key: "name",
    label: "Name",
    sortFn: (a, b) => a.name.localeCompare(b.name),
    render: (row) => row.name,
  },
  {
    key: "score",
    label: "Score",
    sortFn: (a, b) => a.score - b.score,
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

  it("applies default sort ascending on render", () => {
    render(<DataTable data={data} columns={columns} keyFn={keyFn} defaultSortKey="name" />);
    const cells = screen.getAllByRole("cell").filter((c) => ["Alice", "Bob", "Charlie"].includes(c.textContent ?? ""));
    expect(cells.map((c) => c.textContent)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("applies default sort descending when defaultSortDir is Desc", () => {
    render(
      <DataTable
        data={data}
        columns={columns}
        keyFn={keyFn}
        defaultSortKey="name"
        defaultSortDir="desc"
      />,
    );
    const cells = screen.getAllByRole("cell").filter((c) => ["Alice", "Bob", "Charlie"].includes(c.textContent ?? ""));
    expect(cells.map((c) => c.textContent)).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("sorts ascending when a sortable header is clicked", () => {
    render(<DataTable data={data} columns={columns} keyFn={keyFn} />);
    fireEvent.click(screen.getByText("Name"));
    const cells = screen.getAllByRole("cell").filter((c) => ["Alice", "Bob", "Charlie"].includes(c.textContent ?? ""));
    expect(cells.map((c) => c.textContent)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("reverses to descending when the active sort header is clicked again", () => {
    render(<DataTable data={data} columns={columns} keyFn={keyFn} defaultSortKey="name" />);
    fireEvent.click(screen.getByText("Name"));
    const cells = screen.getAllByRole("cell").filter((c) => ["Alice", "Bob", "Charlie"].includes(c.textContent ?? ""));
    expect(cells.map((c) => c.textContent)).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("resets to ascending on the new column when a different header is clicked", () => {
    render(<DataTable data={data} columns={columns} keyFn={keyFn} defaultSortKey="name" />);
    // Currently sorted by name asc: Alice(10), Bob(20), Charlie(30)
    // Click score — should sort score ascending: 10, 20, 30
    fireEvent.click(screen.getByText("Score"));
    const cells = screen.getAllByRole("cell").filter((c) => ["10", "20", "30"].includes(c.textContent ?? ""));
    expect(cells.map((c) => c.textContent)).toEqual(["10", "20", "30"]);
  });

  it("shows the sort icon only on the active column", () => {
    render(<DataTable data={data} columns={columns} keyFn={keyFn} defaultSortKey="name" />);
    // ArrowUp icon is rendered as an svg inside the Name header
    const nameHeader = screen.getByText("Name").closest("th")!;
    const scoreHeader = screen.getByText("Score").closest("th")!;
    expect(nameHeader.querySelector("svg")).toBeInTheDocument();
    expect(scoreHeader.querySelector("svg")).not.toBeInTheDocument();
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
});
