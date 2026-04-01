import { useState } from "react";
import {
  useListEmployeeRequests,
  useFulfillEmployeeRequest,
  useDeleteEmployeeRequest,
  getListEmployeeRequestsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Hammer,
  Construction,
  Package,
  MoreHorizontal,
  CheckCircle2,
  Trash2,
  User,
  Clock,
  InboxIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type EmployeeRequest = {
  id: number;
  crewId: number;
  category: "tool" | "equipment" | "supply" | "other";
  title: string;
  description?: string | null;
  quantity: number;
  priority: "low" | "normal" | "urgent";
  status: "pending" | "fulfilled";
  fulfilledAt?: string | null;
  createdAt: string;
  crew?: { id: number; name: string; role?: string } | null;
};

const CATEGORY_CONFIG = {
  tool: { label: "Tool", Icon: Hammer, color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
  equipment: { label: "Equipment", Icon: Construction, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  supply: { label: "Supply", Icon: Package, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  other: { label: "Other", Icon: MoreHorizontal, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
};

const PRIORITY_CONFIG = {
  low: { label: "Low", class: "bg-gray-100 text-gray-600 border-gray-200" },
  normal: { label: "Normal", class: "bg-blue-50 text-blue-600 border-blue-200" },
  urgent: { label: "Urgent", class: "bg-red-50 text-red-600 border-red-200" },
};

export default function RequestsAdminPage() {
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "fulfilled" | "all">("pending");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "tool" | "equipment" | "supply" | "other">("all");

  const { data: requests = [], isLoading } = useListEmployeeRequests(
    {},
    { query: { refetchInterval: 15000 } }
  );

  const { mutate: fulfill } = useFulfillEmployeeRequest({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListEmployeeRequestsQueryKey() }),
    },
  });

  const { mutate: remove } = useDeleteEmployeeRequest({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListEmployeeRequestsQueryKey() });
        setDeleteId(null);
      },
    },
  });

  const filtered = (requests as EmployeeRequest[]).filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    return true;
  });

  const stats = {
    pending: (requests as EmployeeRequest[]).filter((r) => r.status === "pending").length,
    fulfilled: (requests as EmployeeRequest[]).filter((r) => r.status === "fulfilled").length,
    urgent: (requests as EmployeeRequest[]).filter((r) => r.priority === "urgent" && r.status === "pending").length,
  };

  // Group pending by crew member
  const grouped = filtered.reduce<Record<string, { crew: EmployeeRequest["crew"]; items: EmployeeRequest[] }>>((acc, req) => {
    const key = String(req.crewId);
    if (!acc[key]) acc[key] = { crew: req.crew, items: [] };
    acc[key].items.push(req);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6 text-amber-500" />
          Employee Requests
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and fulfill crew requests for tools, equipment, and supplies.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setStatusFilter("pending")}>
          <p className={cn("text-2xl font-bold", stats.pending > 0 ? "text-amber-600" : "text-muted-foreground")}>{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
          <p className="text-xs text-muted-foreground">Urgent</p>
        </Card>
        <Card className="p-4 text-center cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setStatusFilter("fulfilled")}>
          <p className="text-2xl font-bold text-green-600">{stats.fulfilled}</p>
          <p className="text-xs text-muted-foreground">Fulfilled</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 p-1 bg-muted rounded-md">
          {(["pending", "all", "fulfilled"] as const).map((f) => (
            <button
              key={f}
              className={cn(
                "px-3 py-1 rounded text-sm font-medium transition-colors",
                statusFilter === f ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setStatusFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-md">
          {(["all", "tool", "equipment", "supply", "other"] as const).map((f) => (
            <button
              key={f}
              className={cn(
                "px-3 py-1 rounded text-sm font-medium transition-colors",
                categoryFilter === f ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setCategoryFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <InboxIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {statusFilter === "pending" ? "No pending requests — you're all caught up!" : "No requests found."}
          </p>
        </Card>
      ) : statusFilter === "pending" || statusFilter === "all" ? (
        /* Grouped by crew member */
        <div className="space-y-6">
          {Object.entries(grouped).map(([crewId, { crew, items }]) => (
            <div key={crewId}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {crew?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "?"}
                </div>
                <span className="text-sm font-semibold">{crew?.name ?? `Crew #${crewId}`}</span>
                {crew?.role && <span className="text-xs text-muted-foreground">· {crew.role}</span>}
                <Badge variant="outline" className="ml-auto text-xs">
                  {items.length} request{items.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="space-y-2 pl-9">
                {items.map((req) => <RequestCard key={req.id} req={req} onFulfill={() => fulfill({ id: req.id })} onDelete={() => setDeleteId(req.id)} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat list for fulfilled */
        <div className="space-y-2">
          {filtered.map((req) => (
            <RequestCard key={req.id} req={req} onFulfill={() => fulfill({ id: req.id })} onDelete={() => setDeleteId(req.id)} showCrew />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Request</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the request. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && remove({ id: deleteId })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RequestCard({
  req,
  onFulfill,
  onDelete,
  showCrew = false,
}: {
  req: EmployeeRequest;
  onFulfill: () => void;
  onDelete: () => void;
  showCrew?: boolean;
}) {
  const cat = CATEGORY_CONFIG[req.category];
  const CatIcon = cat.Icon;
  const isFulfilled = req.status === "fulfilled";

  return (
    <Card className={cn("transition-opacity", isFulfilled && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg border shrink-0", cat.bg)}>
            <CatIcon className={cn("h-4 w-4", cat.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={cn("font-medium text-sm leading-5", isFulfilled && "line-through text-muted-foreground")}>
                {req.quantity > 1 && <span className="text-muted-foreground mr-1">×{req.quantity}</span>}
                {req.title}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className={cn("text-xs", PRIORITY_CONFIG[req.priority]?.class)}>
                  {PRIORITY_CONFIG[req.priority]?.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {cat.label}
                </Badge>
              </div>
            </div>
            {req.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(req.createdAt), "MMM d, h:mm a")}
              </span>
              {showCrew && req.crew && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {req.crew.name}
                </span>
              )}
              {isFulfilled && req.fulfilledAt && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Fulfilled {format(new Date(req.fulfilledAt), "MMM d")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isFulfilled && (
              <Button
                size="sm"
                className="gap-1.5 h-8 bg-green-600 hover:bg-green-700 text-white text-xs"
                onClick={onFulfill}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Fulfill
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              title="Remove request"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
