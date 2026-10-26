"use client";

import { useDirection } from "@/components/foundations/direction/direction";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RiChatSmile2Line, RiCloseLine, RiSearchLine } from "@remixicon/react";
import { useSession } from "next-auth/react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { InputBase } from "@/components/base/input/input";
import { Pagination } from "@/components/base/pagination/pagination";
import { Select, SelectItem } from "@/components/base/select/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@/components/base/table/table";
import { ChevronSortDown } from "@/components/foundations/icons/chevrons";
import { isAdminEmail } from "@/lib/admin";
import { guestRegex, withBasePath } from "@/lib/constants";
import { cx } from "@/utils/cx";

const SEEN_KEY = "aharika-feedback-seen";
const PER_PAGE = 8;

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Something isn’t working",
  general: "General",
  idea: "Feature idea",
};

type FeedbackRow = {
  id: string;
  category: string;
  contactEmail: string | null;
  createdAt: string;
  message: string;
  receivedTs: number;
  receivedLabel: string;
  fromLabel: string;
};

function readSeen() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

function writeSeen(ids: Set<string>) {
  window.localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
}

function fromLabel(email: string | null) {
  if (!email || guestRegex.test(email)) return "Guest";
  return email;
}

function receivedLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function SortChevron({ dir }: { dir: false | "asc" | "desc" }) {
  return (
    <ChevronSortDown
      className={cx(
        "size-6 shrink-0 transition-[transform,color] duration-150",
        dir === "asc" && "rotate-180",
        dir ? "text-text-secondary" : "text-text-tertiary",
      )}
    />
  );
}

function FeedbackTable({ rows }: { rows: FeedbackRow[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "receivedTs", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PER_PAGE });

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const categoryOk = category === "all" || row.category === category;
      const text = `${row.message} ${row.fromLabel}`.toLowerCase();
      return categoryOk && (q === "" || text.includes(q));
    });
  }, [rows, query, category]);

  const columns = useMemo<ColumnDef<FeedbackRow>[]>(
    () => [
      {
        accessorKey: "receivedTs",
        header: "Received",
        cell: ({ row }) => (
          <span className="text-body-medium whitespace-nowrap text-text-primary">
            {row.original.receivedLabel}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <Chip variant="subtle" color="gray">
            {CATEGORY_LABELS[row.original.category] ?? row.original.category}
          </Chip>
        ),
      },
      {
        accessorKey: "fromLabel",
        header: "From",
        cell: ({ row }) => (
          <span className="truncate text-body-medium text-text-primary">{row.original.fromLabel}</span>
        ),
      },
      {
        accessorKey: "message",
        header: "Message",
        cell: ({ row }) => (
          <span className="line-clamp-2 text-body-regular text-text-secondary">{row.original.message}</span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const resetPage = () => table.setPageIndex(0);
  const headers = table.getHeaderGroups()[0]?.headers ?? [];
  const bodyRows = table.getRowModel().rows;
  const totalPages = table.getPageCount();
  const colWidths: Record<string, string> = {
    receivedTs: "w-[140px]",
    category: "w-[180px]",
    fromLabel: "w-[200px]",
    message: "w-[360px]",
  };

  return (
    <section
      className={cx(
        "flex w-full flex-col rounded-2xl border border-border-table pt-2",
        totalPages > 1 ? "pb-3" : "pb-0",
      )}
    >
      <div className="flex w-full flex-col items-start gap-3 px-3 py-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col justify-center">
          <p className="text-body-medium whitespace-nowrap text-text-tertiary">Total results</p>
          <p className="text-body-medium whitespace-nowrap text-text-primary">
            {data.length.toLocaleString()} {data.length === 1 ? "message" : "messages"}
          </p>
        </div>
        <div className="flex w-full items-center gap-2.5 sm:w-auto">
          <Select
            aria-label="Filter by category"
            className="shrink-0"
            popoverClassName="min-w-48"
            selectedKey={category}
            onSelectionChange={(key) => {
              setCategory(String(key));
              resetPage();
            }}
          >
            <SelectItem id="all" textValue="All categories">
              All categories
            </SelectItem>
            <SelectItem id="general" textValue="General">
              General
            </SelectItem>
            <SelectItem id="bug" textValue="Something isn’t working">
              Something isn’t working
            </SelectItem>
            <SelectItem id="idea" textValue="Feature idea">
              Feature idea
            </SelectItem>
          </Select>
          <InputBase
            aria-label="Search feedback"
            placeholder="Search"
            leadingIcon={RiSearchLine}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
            }}
            fieldClassName="min-w-[153px] flex-1 rounded-full bg-background-secondary-default sm:w-[153px] sm:min-w-0 sm:flex-none"
            className="text-body-medium"
          />
        </div>
      </div>

      <div className="mt-2 overflow-x-auto">
        <Table aria-label="Feedback" size="md" selectionMode="none" className="min-w-[880px]">
          <TableHeader>
            {headers.map((header) => {
              const id = header.column.id;
              const canSort = header.column.getCanSort();
              const dir = header.column.getIsSorted();
              const label = flexRender(header.column.columnDef.header, header.getContext());
              return (
                <TableColumn key={header.id} id={header.id} isRowHeader={id === "message"} className={colWidths[id]}>
                  {canSort ? (
                    <button
                      type="button"
                      aria-label={`Sort by ${typeof label === "string" ? label : id}`}
                      onClick={header.column.getToggleSortingHandler()}
                      className="flex cursor-pointer items-center gap-0.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                    >
                      <span className={cx("text-body-medium whitespace-nowrap", dir ? "text-text-primary" : "text-text-tertiary")}>
                        {label}
                      </span>
                      <SortChevron dir={dir} />
                    </button>
                  ) : (
                    <span className="text-body-medium whitespace-nowrap text-text-tertiary">{label}</span>
                  )}
                </TableColumn>
              );
            })}
          </TableHeader>
          <TableBody>
            {bodyRows.length > 0 ? (
              bodyRows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={colWidths[cell.column.id]}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center">
                  <span className="text-body-medium text-text-tertiary">No feedback matches your filters.</span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="px-3 pt-3">
          <Pagination
            page={pagination.pageIndex + 1}
            totalPages={totalPages}
            onChange={(page) => table.setPageIndex(page - 1)}
          />
        </div>
      ) : null}
    </section>
  );
}

function FeedbackInboxModal({
  isOpen,
  onClose,
  rows,
}: {
  isOpen: boolean;
  onClose: () => void;
  rows: FeedbackRow[];
}) {
  const direction = useDirection();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
      setMounted(true);
      setScrolled(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      unmountTimer.current = setTimeout(() => setMounted(false), 300);
    }
    return () => {
      if (unmountTimer.current) clearTimeout(unmountTimer.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div dir={direction} className="fixed inset-0 z-100 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close feedback"
        tabIndex={-1}
        onClick={onClose}
        className={cx(
          "absolute inset-0 cursor-default bg-black/70 transition-opacity duration-300 ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Feedbacks"
        tabIndex={-1}
        className={cx(
          "relative flex h-[614px] max-h-[calc(100dvh-32px)] w-[960px] max-w-[calc(100vw-32px)] flex-col overflow-clip rounded-3xl bg-background-full shadow-xs outline-none",
          "transform-gpu transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          visible ? "scale-100 opacity-100 blur-0" : "scale-[0.85] opacity-0 blur-[4px]",
        )}
      >
        <div className="flex shrink-0 items-center justify-between px-8 pt-8 pb-3">
          <h2 className="text-title-3-medium text-text-primary">Feedbacks</h2>
          <button
            type="button"
            aria-label="Close feedback"
            onClick={onClose}
            className={cx(
              "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full",
              "bg-background-tertiary-default text-foreground-icon-secondary",
              "transition-colors duration-150 ease hover:bg-background-tertiary-hover",
              "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            )}
          >
            <RiCloseLine className="size-4" aria-hidden />
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          <div
            className="h-full overflow-y-auto px-8 pb-8"
            onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 0)}
          >
            <FeedbackTable rows={rows} />
          </div>
          <div
            aria-hidden
            className={cx(
              "pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-background-primary-default to-transparent transition-opacity duration-200 ease-out",
              scrolled ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Dashboard control for the admin account. Hidden for everyone else. */
export function ViewFeedbacksButton() {
  const { data: session, status } = useSession();
  const isAdmin = status === "authenticated" && isAdminEmail(session?.user?.email);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [unseen, setUnseen] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      const response = await fetch(withBasePath("/api/feedback"));
      if (!response.ok) return;
      const payload = (await response.json()) as {
        feedback?: Array<{
          id: string;
          category: string;
          contactEmail: string | null;
          createdAt: string;
          message: string;
        }>;
      };
      if (cancelled) return;
      const next = (payload.feedback ?? []).map((row) => ({
        ...row,
        fromLabel: fromLabel(row.contactEmail),
        receivedLabel: receivedLabel(row.createdAt),
        receivedTs: new Date(row.createdAt).getTime(),
      }));
      const seen = readSeen();
      setRows(next);
      setUnseen(next.filter((row) => !seen.has(row.id)).length);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!isAdmin) return null;

  const openInbox = () => {
    const seen = readSeen();
    for (const row of rows) seen.add(row.id);
    writeSeen(seen);
    setUnseen(0);
    setOpen(true);
  };

  return (
    <>
      <span className="relative inline-flex">
        <Button variant="secondary" size="medium" leadingIcon={RiChatSmile2Line} onClick={openInbox}>
          View Feedbacks
        </Button>
        {unseen > 0 ? (
          <span className="pointer-events-none absolute -top-1.5 -end-1.5 flex size-4 items-center justify-center rounded-full border-[1.5px] border-background-primary-default bg-accent-600">
            <span className="w-4 text-center text-[10px] leading-4 font-bold text-text-white">
              {unseen > 9 ? "9+" : unseen}
            </span>
          </span>
        ) : null}
      </span>
      <FeedbackInboxModal isOpen={open} onClose={() => setOpen(false)} rows={rows} />
    </>
  );
}
