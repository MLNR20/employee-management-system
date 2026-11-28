import { renderToStaticMarkup } from "react-dom/server";
import DataTable from "./DataTable";
import TableSkeleton from "../Skeleton";
import { lookups } from "../../resources/shared";

const columns = [{ key: "name", header: "Name" }];
const data = [
  { id: "1", name: "Ana" },
  { id: "2", name: "Ben" },
];

/** The rendered table as a document, to look things up in. */
const render = (element) => {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(element);
  return container;
};
const bodyRows = (container) => container.querySelectorAll("tbody tr");

test("with nothing to show yet, the headings, a page of rows and the count are placeholders", () => {
  const table = render(<DataTable columns={columns} isLoading />);

  expect(table.querySelector("thead .skeleton")).not.toBeNull();
  expect(bodyRows(table)).toHaveLength(10);
  expect(table.textContent).not.toContain("No records found.");
  expect(table.textContent).not.toContain("Showing");
});

test("while the next rows are on their way, only the rows and the count are placeholders", () => {
  const table = render(<DataTable columns={columns} data={data} isRendering isFetching />);

  expect(table.querySelector("thead").textContent).toContain("Name");
  expect(table.querySelector("thead .skeleton")).toBeNull();
  expect(bodyRows(table)).toHaveLength(data.length); // as many as were on screen
  expect(table.querySelector("tbody").textContent).toBe("");
  expect(table.querySelector("table").getAttribute("aria-busy")).toBe("true");
});

test("a background refresh keeps the rows on screen", () => {
  const table = render(<DataTable columns={columns} data={data} isFetching />);

  expect(table.querySelector(".skeleton")).toBeNull();
  expect(table.textContent).toContain("Ana");
});

test("a plain table's placeholder shows the headings it knows and says what is loading", () => {
  const table = render(<TableSkeleton label="Loading the checklist" headers={["Document", "Status"]} rows={3} />);

  expect(table.querySelector("thead").textContent).toBe("DocumentStatus");
  expect(bodyRows(table)).toHaveLength(3);
  expect(table.querySelector('[role="status"]').textContent).toContain("Loading the checklist");
});

test("lookups are loading while any of their lists is", () => {
  expect(lookups({ a: { data: [1], isLoading: false }, b: { isLoading: true } })).toEqual({
    a: [1],
    b: undefined,
    isLoading: true,
  });
  // A list that failed to load is no longer "loading": the table must not wait for it for ever.
  expect(lookups({ a: { data: undefined, isLoading: false } }).isLoading).toBe(false);
});
