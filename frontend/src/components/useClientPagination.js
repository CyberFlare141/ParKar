import { useMemo, useState } from "react";

export default function useClientPagination(items, { pageSize = 5, resetKeys = [] } = {}) {
  const [paginationState, setPaginationState] = useState(() => ({
    currentPage: 1,
    resetSignature: JSON.stringify(resetKeys),
  }));
  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const resetSignature = JSON.stringify(resetKeys);
  const didReset = paginationState.resetSignature !== resetSignature;
  let resolvedCurrentPage = didReset ? 1 : paginationState.currentPage;

  resolvedCurrentPage = Math.min(Math.max(resolvedCurrentPage, 1), totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (resolvedCurrentPage - 1) * pageSize;
    return safeItems.slice(startIndex, startIndex + pageSize);
  }, [pageSize, resolvedCurrentPage, safeItems]);

  const handlePageChange = (value) => {
    setPaginationState((previousState) => {
      const previousPage =
        previousState.resetSignature !== resetSignature
          ? 1
          : previousState.currentPage;
      const nextPage =
        typeof value === "function"
          ? value(previousPage)
          : value;

      return {
        currentPage: Math.min(Math.max(Number(nextPage) || 1, 1), totalPages),
        resetSignature,
      };
    });
  };

  return {
    currentPage: resolvedCurrentPage,
    pageSize,
    paginatedItems,
    setCurrentPage: handlePageChange,
    totalItems,
    totalPages,
  };
}
