import { Link } from "@tanstack/react-router";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { Subscribe } from "@tanstack/react-table";

import { cn } from "cn";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Droplets,
  GraduationCap,
  Lightbulb,
  MoreHorizontal,
  RotateCcw,
  Route,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { formatMoneyRs, formatWorkDate, stallLabel } from "@/lib/mplads-mock";

import { DOSSIER_ENTRY_SEARCH, type RowSeverity, type WorkRow } from "./data";

const TYPE_ICONS = {
  road: Route,
  "community-hall": Building2,
  water: Droplets,
  school: GraduationCap,
  drainage: Waves,
  streetlight: Lightbulb,
} as const;

const SEVERITY_STYLES: Record<RowSeverity, string> = {
  high: "border-destructive/20 bg-destructive/10 text-destructive",
  medium: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  clear: "border-muted-foreground/20 bg-muted text-muted-foreground",
};

const SEVERITY_DOT: Record<RowSeverity, string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-sky-500",
  clear: "bg-muted-foreground",
};

function meterFill(progressPct: number): string {
  if (progressPct >= 70) {
    return "bg-destructive";
  }
  if (progressPct >= 55) {
    return "bg-amber-500";
  }
  return "bg-emerald-500";
}

function SortIcon({ sortDirection }: { sortDirection: false | "asc" | "desc" }) {
  if (sortDirection === "desc") {
    return <ArrowDown data-icon="inline-end" />;
  }
  if (sortDirection === "asc") {
    return <ArrowUp data-icon="inline-end" />;
  }
  return <ArrowUpDown data-icon="inline-end" />;
}

function SortMenuHeader({ column, title }: { column: Column<DataTableFeatures, WorkRow, unknown>; title: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground data-popup-open:bg-accent" />}
      >
        {title}
        <SortIcon sortDirection={column.getIsSorted()} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => column.toggleSorting(false)}>
          <ArrowUp />
          Asc
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => column.toggleSorting(true)}>
          <ArrowDown />
          Desc
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => column.clearSorting()}>
          <RotateCcw />
          Reset
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

async function copyWorkId(id: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(id);
    toast.add({ title: `Copied ${id}` });
  } catch {
    toast.add({ title: "Copy failed", description: "Select the ID manually." });
  }
}

export const columns: ColumnDef<DataTableFeatures, WorkRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Subscribe source={table.atoms.rowSelection}>
        {() => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(value)}
            aria-label="Select all works"
            className="translate-y-0.5"
          />
        )}
      </Subscribe>
    ),
    cell: ({ row }) => (
      <Subscribe source={row.table.atoms.rowSelection} selector={(selection) => Boolean(selection?.[row.id])}>
        {(checked) => (
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => row.toggleSelected(value)}
            aria-label={`Select ${row.original.id}`}
            className="translate-y-0.5"
          />
        )}
      </Subscribe>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <div className="w-20 font-mono text-muted-foreground text-sm">#{row.getValue("id")}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: "Work",
    cell: ({ row }) => {
      const Icon = TYPE_ICONS[row.original.type];
      return (
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <Link
              className="hover:underline"
              to="/dashboard/works/$workId"
              params={{ workId: row.original.id }}
              search={{ ...DOSSIER_ENTRY_SEARCH }}
            >
              <span className="block truncate font-medium text-sm">{row.getValue("title")}</span>
            </Link>
            <div className="truncate text-muted-foreground text-xs">{row.original.agency}</div>
          </div>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "district",
    header: "District",
    cell: ({ row }) => (
      <div>
        <div className="text-sm">{row.getValue("district")}</div>
        <div className="text-muted-foreground text-xs">{row.original.state}</div>
      </div>
    ),
    filterFn: "equalsString",
    enableSorting: false,
  },
  {
    accessorKey: "state",
    filterFn: "equalsString",
    enableHiding: true,
  },
  {
    accessorKey: "type",
    filterFn: "equalsString",
    enableHiding: true,
  },
  {
    accessorKey: "sanctionedRs",
    header: ({ column }) => <SortMenuHeader column={column} title="Amount" />,
    cell: ({ row }) => (
      <div className="text-right font-medium text-sm tabular-nums">{formatMoneyRs(row.getValue("sanctionedRs"))}</div>
    ),
    sortFn: "alphanumeric",
  },
  {
    accessorKey: "progressPct",
    header: "Progress",
    cell: ({ row }) => {
      const progress = row.getValue("progressPct") as number;
      const stalled = row.original.status === "stalled";
      return (
        <div className="min-w-28">
          <div className="h-1.5 rounded-full bg-muted">
            <div className={cn("h-full rounded-full", meterFill(progress))} style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 text-muted-foreground text-xs">
            {progress}%
            {stalled && <span className="text-destructive"> · stalled {stallLabel(row.original.lastUpdate)}</span>}
          </div>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => {
      const severity = row.getValue("severity") as RowSeverity;
      return (
        <Badge
          className={cn("gap-1.5 rounded-sm border font-medium capitalize", SEVERITY_STYLES[severity])}
          variant="outline"
        >
          <span className={cn("size-1.5 rounded-full", SEVERITY_DOT[severity])} />
          {severity}
        </Badge>
      );
    },
    filterFn: "arrIncludes",
    enableSorting: false,
  },
  {
    accessorKey: "kind",
    header: "Kind",
    cell: ({ row }) => {
      const kind = row.original.kind;
      return kind ? (
        <Badge className="rounded-sm" variant="outline">
          {kind}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
    filterFn: "arrIncludes",
    enableSorting: false,
  },
  {
    accessorKey: "lastUpdate",
    header: ({ column }) => <SortMenuHeader column={column} title="Updated" />,
    cell: ({ row }) => (
      <div>
        <div className="text-sm">{formatWorkDate(row.getValue("lastUpdate"))}</div>
        <div className="text-muted-foreground text-xs">{stallLabel(row.original.lastUpdate)}</div>
      </div>
    ),
    sortFn: "alphanumeric",
  },
  {
    accessorKey: "search",
    filterFn: "includesString",
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground data-popup-open:bg-accent" />
            }
          >
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              render={
                <Link
                  to="/dashboard/works/$workId"
                  params={{ workId: row.original.id }}
                  search={{ ...DOSSIER_ENTRY_SEARCH }}
                />
              }
            >
              Open dossier
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                void copyWorkId(row.original.id);
              }}
            >
              Copy ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];
