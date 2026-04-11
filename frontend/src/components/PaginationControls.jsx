import { useEffect, useMemo, useState } from "react";

function buildPageItems(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);

  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);

  if (currentPage <= 2) {
    pages.add(2);
    pages.add(3);
  }

  if (currentPage >= totalPages - 1) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  const sortedPages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const items = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage && page - previousPage > 1) {
      items.push(`ellipsis-${previousPage}-${page}`);
    }
    items.push(page);
  });

  return items;
}

export function useClientPagination(items, { pageSize = 5, resetKeys = [] } = {}) {
  const [currentPage, setCurrentPage] = useState(1);
  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const resetSignature = JSON.stringify(resetKeys);

  useEffect(() => {
    setCurrentPage(1);
  }, [resetSignature]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return safeItems.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, safeItems]);

  return {
    currentPage,
    pageSize,
    paginatedItems,
    setCurrentPage,
    totalItems,
    totalPages,
  };
}

export default function PaginationControls({
  className = "",
  currentPage,
  itemLabel = "items",
  onPageChange,
  pageSize,
  totalItems,
  totalPages,
}) {
  if (totalItems <= pageSize || totalPages <= 1) {
    return null;
  }

  const pageItems = buildPageItems(currentPage, totalPages);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={`mt-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}
    >
      <p>
        Showing <span className="font-semibold text-white">{startItem}-{endItem}</span> of{" "}
        <span className="font-semibold text-white">{totalItems}</span> {itemLabel}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-teal-300/40 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>

        {pageItems.map((item) =>
          typeof item === "string" ? (
            <span key={item} className="px-1 text-slate-500">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === currentPage ? "page" : undefined}
              className={`min-w-10 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                item === currentPage
                  ? "border-teal-300/50 bg-teal-400/15 text-teal-100"
                  : "border-white/10 text-slate-200 hover:border-teal-300/40 hover:text-teal-200"
              }`}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 transition hover:border-teal-300/40 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
