import { useMemo, useRef, useState } from "react";

export default function useClientPagination(items, { pageSize = 5, resetKeys = [] } = {}) {
  const [currentPage, setCurrentPage] = useState(1);
  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const resetSignature = JSON.stringify(resetKeys);
  const resetSignatureRef = useRef(resetSignature);

  let resolvedCurrentPage = currentPage;

  if (resetSignatureRef.current !== resetSignature) {
    resetSignatureRef.current = resetSignature;
    resolvedCurrentPage = 1;
  }

  resolvedCurrentPage = Math.min(Math.max(resolvedCurrentPage, 1), totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (resolvedCurrentPage - 1) * pageSize;
    return safeItems.slice(startIndex, startIndex + pageSize);
  }, [pageSize, resolvedCurrentPage, safeItems]);

  const handlePageChange = (value) => {
    const nextPage =
      typeof value === "function"
        ? value(resolvedCurrentPage)
        : value;

    setCurrentPage(Math.min(Math.max(Number(nextPage) || 1, 1), totalPages));
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
