import { useState, useEffect } from "react";
import {
  useListCrew,
  useListTimeOffRequests,
  useListCrewTimeOff,
  useCreateTimeOffRequest,
  useUpdateTimeOffRequest,
  useDeleteTimeOffRequest,
  getListTimeOffRequestsQueryKey,
  getListCrewTimeOffQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  CalendarOff,
  Check,
  X,
  Clock,
  Trash2,
  Plus,
  User,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";

const statusConfig = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", icon: Clock },
  approved: { label: "Approved", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: Check },
  denied: { label: "Denied", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: X },
};

const submitSchema = z.object({
  crewId: z.string().min(1, "Please select your name"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(3, "Please provide a reason"),
});

type SubmitFormValues = z.infer<typeof submitSchema>;

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.pending;
  return (
    <Badge className={`gap-1 ${cfg.className}`}>
      <cfg.icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

function DenyDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (notes: string) => void;
  isPending: boolean;
}) {
  const [notes, setNotes] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Deny Request</DialogTitle>
          <DialogDescription>Optionally add a note for the crew member.</DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Reason for denial (optional)..."
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={isPending} onClick={() => onConfirm(notes)}>
            {isPending ? "Denying..." : "Deny Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AllRequestsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: requests, isLoading } = useListTimeOffRequests();
  const [denyTarget, setDenyTarget] = useState<number | null>(null);

  const { mutate: updateRequest, isPending: isUpdating } = useUpdateTimeOffRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTimeOffRequestsQueryKey() });
        toast({ title: "Request updated" });
        setDenyTarget(null);
      },
      onError: () => toast({ title: "Failed to update request", variant: "destructive" }),
    },
  });

  const { mutate: deleteRequest } = useDeleteTimeOffRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTimeOffRequestsQueryKey() });
        toast({ title: "Request deleted" });
      },
      onError: () => toast({ title: "Failed to delete request", variant: "destructive" }),
    },
  });

  const pending = requests?.filter((r) => r.status === "pending") ?? [];
  const others = requests?.filter((r) => r.status !== "pending") ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (!requests?.length) {
    return (
      <div className="text-center py-16">
        <CalendarOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No time-off requests yet.</p>
      </div>
    );
  }

  const RequestRow = ({ req }: { req: (typeof requests)[0] }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold shrink-0">
          {req.crew.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <p className="font-medium text-sm">{req.crew.name}</p>
          <p className="text-xs text-muted-foreground">{req.crew.role}</p>
          <p className="text-sm mt-1">
            <span className="font-medium">{formatDate(req.startDate)}</span>
            {" → "}
            <span className="font-medium">{formatDate(req.endDate)}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-0.5 italic">"{req.reason}"</p>
          {req.adminNotes && (
            <p className="text-xs text-muted-foreground mt-1 bg-secondary/60 rounded px-2 py-1">
              Note: {req.adminNotes}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0">
        <StatusBadge status={req.status} />
        {req.status === "pending" && (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => updateRequest({ id: req.id, data: { status: "approved" } })}
              disabled={isUpdating}
            >
              <Check className="h-3 w-3" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setDenyTarget(req.id)}
            >
              <X className="h-3 w-3" /> Deny
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => { if (confirm("Delete this request?")) deleteRequest({ id: req.id }); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {pending.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 shadow-sm">
          <CardHeader className="pb-2 bg-amber-50/60 dark:bg-amber-950/20 rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Pending Review
              <Badge variant="secondary" className="ml-auto">{pending.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border px-4">
            {pending.map((req) => <RequestRow key={req.id} req={req} />)}
          </CardContent>
        </Card>
      )}

      {others.length > 0 && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">Past Requests</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border px-4">
            {others.map((req) => <RequestRow key={req.id} req={req} />)}
          </CardContent>
        </Card>
      )}

      <DenyDialog
        open={denyTarget !== null}
        onOpenChange={(v) => { if (!v) setDenyTarget(null); }}
        isPending={isUpdating}
        onConfirm={(notes) => {
          if (denyTarget !== null) {
            updateRequest({ id: denyTarget, data: { status: "denied", adminNotes: notes || undefined } });
          }
        }}
      />
    </>
  );
}

function MyRequestsTab({ selectedCrewId }: { selectedCrewId: number | null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: myRequests, isLoading } = useListCrewTimeOff(selectedCrewId ?? 0, {
    query: { enabled: !!selectedCrewId, queryKey: getListCrewTimeOffQueryKey(selectedCrewId ?? 0) },
  });

  const { mutate: deleteRequest } = useDeleteTimeOffRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCrewTimeOffQueryKey(selectedCrewId ?? 0) });
        queryClient.invalidateQueries({ queryKey: getListTimeOffRequestsQueryKey() });
        toast({ title: "Request cancelled" });
      },
      onError: () => toast({ title: "Failed to cancel request", variant: "destructive" }),
    },
  });

  if (!selectedCrewId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <User className="h-10 w-10 mx-auto mb-3" />
        <p>Select your name above to view your requests.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  if (!myRequests?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CalendarOff className="h-10 w-10 mx-auto mb-3" />
        <p>You have no time-off requests.</p>
      </div>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="divide-y divide-border px-4 pt-2">
        {myRequests.map((req) => (
          <div key={req.id} className="flex items-start justify-between gap-3 py-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={req.status} />
                <span className="text-xs text-muted-foreground">
                  Submitted {formatDate(req.createdAt)}
                </span>
              </div>
              <p className="text-sm font-medium">
                {formatDate(req.startDate)} → {formatDate(req.endDate)}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">"{req.reason}"</p>
              {req.adminNotes && (
                <p className="text-xs mt-1 bg-secondary/60 rounded px-2 py-1">
                  Foreman note: {req.adminNotes}
                </p>
              )}
            </div>
            {req.status === "pending" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => { if (confirm("Cancel this time-off request?")) deleteRequest({ id: req.id }); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function TimeOffPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: crew } = useListCrew();

  const [selectedCrewId, setSelectedCrewId] = useState<number | null>(() => {
    const saved = localStorage.getItem("cc_crew_id");
    return saved ? parseInt(saved) : null;
  });

  useEffect(() => {
    if (selectedCrewId) localStorage.setItem("cc_crew_id", String(selectedCrewId));
  }, [selectedCrewId]);

  const { mutate: createRequest, isPending: isSubmitting } = useCreateTimeOffRequest({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTimeOffRequestsQueryKey() });
        if (selectedCrewId) queryClient.invalidateQueries({ queryKey: getListCrewTimeOffQueryKey(selectedCrewId) });
        toast({ title: "Time-off request submitted" });
        form.reset({ crewId: String(selectedCrewId ?? ""), startDate: "", endDate: "", reason: "" });
      },
      onError: () => toast({ title: "Failed to submit request", variant: "destructive" }),
    },
  });

  const form = useForm<SubmitFormValues>({
    resolver: zodResolver(submitSchema),
    defaultValues: { crewId: selectedCrewId ? String(selectedCrewId) : "", startDate: "", endDate: "", reason: "" },
  });

  const handleSubmit = (values: SubmitFormValues) => {
    createRequest({
      data: {
        crewId: parseInt(values.crewId),
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
        reason: values.reason,
      },
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Time Off</h1>
        <p className="text-muted-foreground">Submit and manage crew time-off requests.</p>
      </div>

      {/* Who am I */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Who are you?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedCrewId ? String(selectedCrewId) : ""}
            onValueChange={(v) => {
              const id = parseInt(v);
              setSelectedCrewId(id);
              form.setValue("crewId", v);
            }}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Select your name..." />
            </SelectTrigger>
            <SelectContent>
              {crew?.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name} — {m.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="request" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-sm h-auto p-1 bg-muted/50">
          <TabsTrigger value="request" className="py-2 text-sm">Request</TabsTrigger>
          <TabsTrigger value="mine" className="py-2 text-sm">My Requests</TabsTrigger>
          <TabsTrigger value="all" className="py-2 text-sm">All Requests</TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-4">
          {/* Submit request */}
          <TabsContent value="request" className="outline-none focus-visible:ring-0">
            <Card className="border-border shadow-sm max-w-xl">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> New Time-Off Request
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField control={form.control} name="crewId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name *</FormLabel>
                        <Select value={field.value} onValueChange={(v) => { field.onChange(v); setSelectedCrewId(parseInt(v)); }}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your name..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {crew?.map((m) => (
                              <SelectItem key={m.id} value={String(m.id)}>
                                {m.name} — {m.role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="startDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date *</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="endDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date *</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="reason" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Family vacation, medical appointment, personal day..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Submitting..." : "Submit Request"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My requests */}
          <TabsContent value="mine" className="outline-none focus-visible:ring-0">
            <MyRequestsTab selectedCrewId={selectedCrewId} />
          </TabsContent>

          {/* All requests — admin view */}
          <TabsContent value="all" className="outline-none focus-visible:ring-0 space-y-4">
            <AllRequestsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
