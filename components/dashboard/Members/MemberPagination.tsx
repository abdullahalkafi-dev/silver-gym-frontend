// components/dashboard/Members/MemberPagination.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

export const MEMBER_PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;
export const DEFAULT_MEMBER_PAGE_SIZE = 100;

interface MemberPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const MemberPagination: React.FC<MemberPaginationProps> = ({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t border-gray-100">
      <p className="text-sm text-gray-600">
        Showing <span className="font-medium text-gray-800">{from}</span>–
        <span className="font-medium text-gray-800">{to}</span> of{" "}
        <span className="font-medium text-gray-800">{total}</span> members
      </p>

      <div className="flex flex-wrap items-center gap-4">
        {/* Rows per page */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page</span>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-haspopup="listbox"
              aria-expanded={open}
              className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              {pageSize}
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className={`transition-transform ${open ? "" : "rotate-180"}`}
              >
                <path
                  d="M5 12l5-5 5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {open && (
              <ul
                role="listbox"
                className="absolute bottom-full right-0 z-20 mb-2 w-24 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              >
                {MEMBER_PAGE_SIZE_OPTIONS.map((option) => {
                  const selected = option === pageSize;
                  return (
                    <li key={option} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          if (!selected) onPageSizeChange(option);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-[#F2EEFF] ${
                          selected
                            ? "font-semibold text-purple"
                            : "text-gray-700"
                        }`}
                      >
                        {option}
                        {selected && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 20 20"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M4 10.5l4 4 8-9"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Page controls */}
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberPagination;
