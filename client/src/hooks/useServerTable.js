import { useCallback, useMemo, useState } from "react";

/**
 * State for a server-paginated table: current page, page size, search text and sort.
 * `params` is what the list endpoint is asked for; pass the hook's result to
 * <DataTable server={table} />. Changing the page size, search or sort goes back to page 1.
 */
export function useServerTable({ initialPageSize = 10 } = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [search, setSearchState] = useState("");
  const [sort, setSortState] = useState({ key: null, direction: "asc" });

  const setPageSize = useCallback((size) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const setSearch = useCallback((text) => {
    setSearchState(text);
    setPage(1);
  }, []);

  const setSort = useCallback((next) => {
    setSortState(next);
    setPage(1);
  }, []);

  const params = useMemo(
    () => ({ page, pageSize, search, sortBy: sort.key ?? undefined, sortDir: sort.direction }),
    [page, pageSize, search, sort]
  );

  return { page, pageSize, search, sort, params, setPage, setPageSize, setSearch, setSort };
}
