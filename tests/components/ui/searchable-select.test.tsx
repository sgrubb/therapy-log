import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchableSelect } from "@/components/ui/searchable-select";

const options = [
  { value: "1", label: "Alice Morgan" },
  { value: "2", label: "Bob Chen" },
  { value: "3", label: "Carol Davis" },
];

function renderSelect(value = "", onChange = vi.fn()) {
  return render(
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder="Select therapist…"
      aria-label="Therapist"
    />,
  );
}

describe("SearchableSelect", () => {
  it("renders a trigger button with the placeholder when no value is selected", () => {
    renderSelect();
    expect(screen.getByRole("combobox", { name: "Therapist" })).toBeInTheDocument();
    expect(screen.getByText("Select therapist…")).toBeInTheDocument();
  });

  it("shows the selected option label on the trigger when a value is set", () => {
    renderSelect("2");
    expect(screen.getByText("Bob Chen")).toBeInTheDocument();
  });

  it("opens a dropdown with a search input when the trigger is clicked", () => {
    renderSelect();
    expect(screen.queryByPlaceholderText("Search…")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox", { name: "Therapist" }));

    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
  });

  it("lists all options when the dropdown is open", () => {
    renderSelect();
    fireEvent.click(screen.getByRole("combobox", { name: "Therapist" }));

    expect(screen.getByText("Alice Morgan")).toBeInTheDocument();
    expect(screen.getByText("Bob Chen")).toBeInTheDocument();
    expect(screen.getByText("Carol Davis")).toBeInTheDocument();
  });

  it("filters options as the user types in the search box", () => {
    renderSelect();
    fireEvent.click(screen.getByRole("combobox", { name: "Therapist" }));
    fireEvent.change(screen.getByPlaceholderText("Search…"), { target: { value: "bob" } });

    expect(screen.getByText("Bob Chen")).toBeInTheDocument();
    expect(screen.queryByText("Alice Morgan")).not.toBeInTheDocument();
    expect(screen.queryByText("Carol Davis")).not.toBeInTheDocument();
  });

  it("shows 'No results.' when search matches nothing", () => {
    renderSelect();
    fireEvent.click(screen.getByRole("combobox", { name: "Therapist" }));
    fireEvent.change(screen.getByPlaceholderText("Search…"), { target: { value: "zzz" } });

    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("calls onValueChange with the correct value when an option is clicked", () => {
    const onChange = vi.fn();
    renderSelect("", onChange);
    fireEvent.click(screen.getByRole("combobox", { name: "Therapist" }));
    fireEvent.click(screen.getByText("Bob Chen"));

    expect(onChange).toHaveBeenCalledWith("2");
  });

  it("closes the dropdown after an option is selected", () => {
    renderSelect();
    fireEvent.click(screen.getByRole("combobox", { name: "Therapist" }));
    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Alice Morgan"));

    expect(screen.queryByPlaceholderText("Search…")).not.toBeInTheDocument();
  });

  it("calls onBlur when an option is selected", () => {
    const onBlur = vi.fn();
    render(
      <SearchableSelect
        options={options}
        value=""
        onValueChange={vi.fn()}
        onBlur={onBlur}
        aria-label="Therapist"
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Therapist" }));
    fireEvent.click(screen.getByText("Alice Morgan"));

    expect(onBlur).toHaveBeenCalled();
  });

  it("closes the dropdown when Escape is pressed in the search box", () => {
    renderSelect();
    fireEvent.click(screen.getByRole("combobox", { name: "Therapist" }));
    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByPlaceholderText("Search…"), { key: "Escape" });

    expect(screen.queryByPlaceholderText("Search…")).not.toBeInTheDocument();
  });

  it("applies aria-invalid to the trigger when aria-invalid is true", () => {
    render(
      <SearchableSelect
        options={options}
        value=""
        onValueChange={vi.fn()}
        aria-label="Therapist"
        aria-invalid={true}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Therapist" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
