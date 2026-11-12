export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

const toPositiveInt = (value, fallback) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

/**
 * Turns raw query-string values into a safe page request: page >= 1,
 * 1 <= pageSize <= MAX_PAGE_SIZE, trimmed search text, and a sort direction of 1 or -1.
 * `sortBy` is passed through; the repository decides which fields it may sort on.
 */
export const normalizePageQuery = (query = {}) => ({
  page: toPositiveInt(query.page, 1),
  pageSize: Math.min(toPositiveInt(query.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE),
  search: typeof query.search === "string" ? query.search.trim() : "",
  sortBy: typeof query.sortBy === "string" && query.sortBy ? query.sortBy : undefined,
  sortDir: String(query.sortDir).toLowerCase() === "desc" ? -1 : 1,
});

/** What a paged list returns: one page of items plus what the client needs to draw pagination. */
export const toPage = ({ items, total }, { page, pageSize }) => ({
  items,
  total,
  page,
  pageSize,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});
