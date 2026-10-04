"use client";

import { useMemo, useState } from "react";
import {
  RiDeleteBin6Line,
  RiMore2Fill,
  RiRestaurantLine,
  RiSearchLine,
} from "@remixicon/react";
import { Focusable } from "react-aria-components";
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
import { StatusDot } from "@/components/base/badges/status-dot";
import { IconButton } from "@/components/base/buttons/icon-button";
import {
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "@/components/base/dropdown/dropdown";
import { InputBase } from "@/components/base/input/input";
import { Pagination } from "@/components/base/pagination/pagination";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/base/segmented-control/segmented-control";
import { Select, SelectItem } from "@/components/base/select/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@/components/base/table/table";
import type { TableSize } from "@/components/base/table/table";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { ChevronSortDown } from "@/components/foundations/icons/chevrons";
import { cx } from "@/utils/cx";

export type NutritionMealRow = {
  id: string;
  description: string;
  mealType: string;
  confidence: string;
  calories: number;
  loggedLabel: string;
  loggedTs: number;
};

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

const CONFIDENCE_FILTERS = [
  { id: "all", label: "All status" },
  { id: "verified", label: "Verified" },
  { id: "estimated", label: "Estimated" },
] as const;

const CALORIE_BUCKETS = [
  { id: "all", label: "All calories", test: () => true },
  { id: "light", label: "Under 300 kcal", test: (c: number) => c < 300 },
  { id: "medium", label: "300–600 kcal", test: (c: number) => c >= 300 && c <= 600 },
  { id: "heavy", label: "Over 600 kcal", test: (c: number) => c > 600 },
] as const;

function confidenceStatus(confidence: string) {
  const key = confidence.toLowerCase();
  if (key === "high") return { label: "Verified", color: "lime" as const };
  return { label: "Estimated", color: "yellow" as const };
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

function RowActionButton({
  icon,
  label,
  onPress,
}: {
  icon: typeof RiDeleteBin6Line;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TooltipTrigger delay={200}>
      <Focusable>
        <IconButton icon={icon} size="small" aria-label={label} onClick={onPress} />
      </Focusable>
      <Tooltip size="md">{label}</Tooltip>
    </TooltipTrigger>
  );
}

function RowMoreMenu({ name, onDelete }: { name: string; onDelete?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <TooltipTrigger delay={200}>
        <DropdownTrigger
          aria-label={`More actions for ${name}`}
          className={cx(
            "relative inline-flex size-8 shrink-0 items-center justify-center rounded-2lg",
            "border border-border-button-default bg-background-primary-default text-foreground-icon-primary shadow-xs",
            "transition-[background-color,border-color,box-shadow,color] duration-150 ease",
            "hover:border-border-button-hover hover:bg-background-primary-hover",
            isOpen && "border-border-button-active bg-background-primary-active",
          )}
        >
          <RiMore2Fill className="size-4 shrink-0" aria-hidden />
        </DropdownTrigger>
        <Tooltip size="md">More actions</Tooltip>
      </TooltipTrigger>
      <DropdownPopover aria-label={`More actions for ${name}`} placement="bottom end" className="w-[200px] p-2">
        <DropdownGroup>
          <DropdownItem
            onSelect={() => {
              setIsOpen(false);
              onDelete?.();
            }}
            className="px-2 py-1.5"
          >
            <RiDeleteBin6Line className="size-[18px] shrink-0 text-foreground-icon-secondary" aria-hidden />
            <span className="truncate text-body-medium whitespace-nowrap text-text-primary">Delete entry</span>
          </DropdownItem>
        </DropdownGroup>
      </DropdownPopover>
    </Dropdown>
  );
}

const PER_PAGE = 8;

export function NutritionMealsTable({
  rows,
  onDelete,
}: {
  rows: NutritionMealRow[];
  onDelete?: (id: string) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PER_PAGE });
  const [mealFilter, setMealFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [calorieFilter, setCalorieFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<TableSize>("md");

  const data = useMemo(() => {
    const bucket = CALORIE_BUCKETS.find((b) => b.id === calorieFilter) ?? CALORIE_BUCKETS[0];
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const conf = row.confidence.toLowerCase();
      const confOk =
        confidenceFilter === "all" ||
        (confidenceFilter === "verified" && conf === "high") ||
        (confidenceFilter === "estimated" && conf !== "high");
      return (
        bucket.test(row.calories) &&
        (mealFilter === "all" || row.mealType === mealFilter) &&
        confOk &&
        (q === "" || row.description.toLowerCase().includes(q))
      );
    });
  }, [rows, mealFilter, confidenceFilter, calorieFilter, query]);

  const columns = useMemo<ColumnDef<NutritionMealRow>[]>(
    () => [
      {
        accessorKey: "description",
        header: "Meal",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-tertiary-default">
              <RiRestaurantLine className="size-4 text-foreground-icon-secondary" aria-hidden />
            </span>
            <span className="truncate text-body-medium text-text-primary">{row.original.description}</span>
          </div>
        ),
      },
      {
        accessorKey: "mealType",
        header: "Type",
        cell: ({ row }) => (
          <Chip variant="subtle" color="gray">
            <span className="capitalize">{row.original.mealType}</span>
          </Chip>
        ),
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => {
          const status = confidenceStatus(row.original.confidence);
          return (
            <span className="inline-flex items-center gap-1.5 text-body-medium text-text-primary">
              <StatusDot color={status.color === "lime" ? "green" : "yellow"} />
              {status.label}
            </span>
          );
        },
      },
      {
        accessorKey: "loggedTs",
        header: "Logged",
        cell: ({ row }) => (
          <span className="text-body-medium whitespace-nowrap text-text-primary">{row.original.loggedLabel}</span>
        ),
      },
      {
        accessorKey: "calories",
        header: "Calories",
        cell: ({ row }) => (
          <Chip variant="subtle" color="gray">
            {Math.round(row.original.calories)} kcal
          </Chip>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2.5">
            <RowActionButton
              icon={RiDeleteBin6Line}
              label="Delete meal"
              onPress={() => onDelete?.(row.original.id)}
            />
            <RowMoreMenu
              name={row.original.description}
              onDelete={() => onDelete?.(row.original.id)}
            />
          </div>
        ),
      },
    ],
    [onDelete],
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
  const headers = table.getHeaderGroups()[0].headers;
  const bodyRows = table.getRowModel().rows;
  const totalPages = table.getPageCount();
  const colWidths: Record<string, string> = {
    description: "w-[280px]",
    mealType: "w-[120px]",
    status: "w-[148px]",
    loggedTs: "w-[160px]",
    calories: "w-[120px]",
    actions: "w-[132px]",
  };

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <section
        className={cx(
          "flex w-full flex-col rounded-2xl border border-border-table pt-2",
          totalPages > 1 ? "pb-3" : "pb-0",
        )}
      >
        <div className="flex w-full flex-col items-start gap-3 px-3 py-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col justify-center">
            <p className="text-body-medium whitespace-nowrap text-text-tertiary">Total Results</p>
            <p className="text-body-medium whitespace-nowrap text-text-primary">
              {data.length.toLocaleString()} meals
            </p>
          </div>
          <div className="-mx-3 flex w-[calc(100%+1.5rem)] items-center gap-2.5 overflow-x-auto px-3 sm:mx-0 sm:w-auto sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0">
            <Select
              aria-label="Filter by calories"
              className="shrink-0"
              popoverClassName="min-w-40"
              selectedKey={calorieFilter}
              onSelectionChange={(k) => {
                setCalorieFilter(String(k));
                resetPage();
              }}
            >
              {CALORIE_BUCKETS.map((b) => (
                <SelectItem key={b.id} id={b.id} textValue={b.label}>
                  {b.label}
                </SelectItem>
              ))}
            </Select>
            <Select
              aria-label="Filter by meal type"
              className="shrink-0"
              popoverClassName="min-w-40"
              selectedKey={mealFilter}
              onSelectionChange={(k) => {
                setMealFilter(String(k));
                resetPage();
              }}
            >
              <SelectItem id="all" textValue="All meals">
                All meals
              </SelectItem>
              {MEAL_TYPES.map((type) => (
                <SelectItem key={type} id={type} textValue={type}>
                  <span className="capitalize">{type}</span>
                </SelectItem>
              ))}
            </Select>
            <Select
              aria-label="Filter by status"
              className="shrink-0"
              popoverClassName="min-w-44"
              selectedKey={confidenceFilter}
              onSelectionChange={(k) => {
                setConfidenceFilter(String(k));
                resetPage();
              }}
            >
              {CONFIDENCE_FILTERS.map((f) => (
                <SelectItem key={f.id} id={f.id} textValue={f.label}>
                  {f.label}
                </SelectItem>
              ))}
            </Select>
            <InputBase
              aria-label="Search meals"
              placeholder="Search"
              leadingIcon={RiSearchLine}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPage();
              }}
              fieldClassName="min-w-[153px] flex-1 rounded-full bg-background-secondary-default sm:w-[153px] sm:min-w-0 sm:flex-none"
              className="text-body-medium"
            />
          </div>
        </div>

        <div className="mt-2">
          <Table aria-label="Meal log" size={size} selectionMode="none" className="min-w-[960px]">
            <TableHeader>
              {headers.map((header) => {
                const id = header.column.id;
                const canSort = header.column.getCanSort();
                const dir = header.column.getIsSorted();
                const label = flexRender(header.column.columnDef.header, header.getContext());
                return (
                  <TableColumn key={header.id} id={header.id} isRowHeader={id === "description"} className={colWidths[id]}>
                    {canSort ? (
                      <button
                        type="button"
                        aria-label={`Sort by ${label}`}
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex cursor-pointer items-center gap-0.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus-ring"
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
                    <span className="text-body-medium text-text-tertiary">No meals match your filters.</span>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="px-3 pt-3">
            <Pagination page={pagination.pageIndex + 1} totalPages={totalPages} onChange={(p) => table.setPageIndex(p - 1)} />
          </div>
        )}
      </section>

      <SegmentedControl
        aria-label="Table density"
        selectedKeys={new Set([size])}
        onSelectionChange={(keys) => {
          const next = String([...keys][0] ?? "");
          if (next === "md" || next === "sm") setSize(next);
        }}
      >
        <SegmentedControlItem id="md">Normal</SegmentedControlItem>
        <SegmentedControlItem id="sm">Compact</SegmentedControlItem>
      </SegmentedControl>
    </div>
  );
}
