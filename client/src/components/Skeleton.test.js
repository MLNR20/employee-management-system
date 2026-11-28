import { renderToStaticMarkup } from "react-dom/server";
import StatCard from "./StatCard";
import { ChartSkeleton, ListSkeleton, PieSkeleton } from "./Skeleton";

/** The rendered element as a document, to look things up in. */
const render = (element) => {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(element);
  return container;
};

test("a count card shows a placeholder instead of a number while loading", () => {
  const loading = render(<StatCard label="Active" value="-" loading />);
  expect(loading.querySelectorAll(".skeleton")).toHaveLength(1);
  expect(loading.textContent).toBe("Active");

  const loaded = render(<StatCard label="Active" value={0} />);
  expect(loaded.querySelector(".skeleton")).toBeNull();
  expect(loaded.textContent).toBe("Active0"); // a real zero is shown
});

test("the dashboard placeholders say what is loading and have the shape of what comes", () => {
  const list = render(<ListSkeleton rows={4} label="Loading the pending tasks" />);
  expect(list.querySelector('[role="status"]').textContent).toBe("Loading the pending tasks…");
  expect(list.querySelectorAll("li")).toHaveLength(4);

  const line = render(<ChartSkeleton />);
  expect(line.querySelector('.skeleton[style*="aspect-ratio"]')).not.toBeNull();

  const pie = render(<PieSkeleton slices={4} />);
  expect(pie.querySelectorAll(".skeleton")).toHaveLength(5); // the circle and one bar per slice
});
