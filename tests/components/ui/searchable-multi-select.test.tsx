import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";

const options = [
  { value: "1", label: "Alice Morgan" },
  { value: "2", label: "Bob Chen" },
  { value: "3", label: "Carol Davis" },
];

function renderSelect(value: string[] = [], onChange = vi.fn()) {
  return render(
    <SearchableMultiSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Select therapists…"
    />,
  );
}

describe("SearchableMultiSelect", () => {
  it("renders with placeholder when nothing is selected", () => {
    renderSelect();
    expect(screen.getByText("Select therapists…")).toBeInTheDocument();
  });

  it("shows single selected option label on the trigger", () => {
    renderSelect(["2"]);
    expect(screen.getByText("Bob Chen")).toBeInTheDocument();
  });

  it("shows count label when multiple options are selected", () => {
    renderSelect(["1", "2"]);
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("opens a dropdown with a search input when the trigger is clicked", () => {
    renderSelect();
    expect(screen.queryByPlaceholderText("Search…")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
  });

  it("lists all options when the dropdown is open", () => {
    renderSelect();
    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText("Alice Morgan")).toBeInTheDocument();
    expect(screen.getByText("Bob Chen")).toBeInTheDocument();
    expect(screen.getByText("Carol Davis")).toBeInTheDocument();
  });

  it("filters options as the user types in the search box", () => {
    renderSelect();
    fireEvent.click(screen.getByRole("button"));
    fireEvent.change(screen.getByPlaceholderText("Search…"), { target: { value: "bob" } });

    expect(screen.getByText("Bob Chen")).toBeInTheDocument();
    expect(screen.queryByText("Alice Morgan")).not.toBeInTheDocument();
    expect(screen.queryByText("Carol Davis")).not.toBeInTheDocument();
  });

  it("calls onChange with added value when an unchecked option is clicked", () => {
    const onChange = vi.fn();
    renderSelect([], onChange);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByLabelText("Bob Chen"));

    expect(onChange).toHaveBeenCalledWith(["2"]);
  });

  it("calls onChange with value removed when a checked option is clicked", () => {
    const onChange = vi.fn();
    renderSelect(["2"], onChange);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByLabelText("Bob Chen"));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("closes the dropdown when Escape is pressed in the search box", () => {
    renderSelect();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByPlaceholderText("Search…"), { key: "Escape" });

    expect(screen.queryByPlaceholderText("Search…")).not.toBeInTheDocument();
  });
});
