import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  useListJobs, useCreateJob, useGetJob,
  useListJobTasks, useListJobPhotos, useListJobEquipment,
  useCreateTask, useCreateEquipment,
  getListJobsQueryKey, getGetUpcomingJobsQueryKey, getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/format";
import { Briefcase, MapPin, Plus, Copy, ChevronDown, ChevronUp, Image, CheckSquare, Wrench, FileText, X, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Schema ───────────────────────────────────────────────────────────────────

const createJobSchema = z.object({
  title: z.string().min(1, "Title is required"),
  location: z.string().min(1, "Location is required"),
  scope: z.string().min(1, "Scope is required"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

type CreateJobValues = z.infer<typeof createJobSchema>;

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled:   { label: "Scheduled",   className: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", className: "bg-amber-100 text-amber-700 border-amber-200" },
  completed:   { label: "Completed",   className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled:   { label: "Cancelled",   className: "bg-red-100 text-red-700 border-red-200" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={`shrink-0 ${cfg.className}`}>{cfg.label}</Badge>;
}

// ─── Template preview panel ────────────────────────────────────────────────

function TemplatePreview({
  jobId,
  onClear,
  onApply,
}: {
  jobId: number;
  onClear: () => void;
  onApply: (data: { location: string; scope: string; notes: string }) => void;
}) {
  const { data: job, isLoading: jobLoading } = useGetJob(jobId, { query: { enabled: !!jobId } });
  const { data: tasks } = useListJobTasks(jobId, { query: { enabled: !!jobId } });
  const { data: equipment } = useListJobEquipment(jobId, { query: { enabled: !!jobId } });
  const { data: photos } = useListJobPhotos(jobId, { query: { enabled: !!jobId } });

  useEffect(() => {
    if (job) {
      onApply({
        location: job.location ?? "",
        scope: job.scope ?? "",
        notes: job.notes ?? "",
      });
    }
  }, [job?.id]);

  if (jobLoading) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (!job) return null;

  const photosList = photos ?? [];
  const tasksList = tasks ?? [];
  const equipList = equipment ?? [];

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Copy className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate">Template: {job.title}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" /> {job.location}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* What will be copied */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-background rounded-md p-2 text-center border border-border">
          <div className="flex items-center justify-center gap-1 text-primary mb-0.5">
            <CheckSquare className="h-3.5 w-3.5" />
            <span className="text-lg font-bold">{tasksList.length}</span>
          </div>
          <p className="text-xs text-muted-foreground">Tasks</p>
        </div>
        <div className="bg-background rounded-md p-2 text-center border border-border">
          <div className="flex items-center justify-center gap-1 text-primary mb-0.5">
            <Wrench className="h-3.5 w-3.5" />
            <span className="text-lg font-bold">{equipList.length}</span>
          </div>
          <p className="text-xs text-muted-foreground">Equipment</p>
        </div>
        <div className="bg-background rounded-md p-2 text-center border border-border">
          <div className="flex items-center justify-center gap-1 text-primary mb-0.5">
            <Image className="h-3.5 w-3.5" />
            <span className="text-lg font-bold">{photosList.length}</span>
          </div>
          <p className="text-xs text-muted-foreground">Photos</p>
        </div>
      </div>

      {/* Photo thumbnails */}
      {photosList.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {photosList.slice(0, 6).map((p) => (
            <div key={p.id} className="relative w-14 h-14 rounded-md overflow-hidden border border-border shrink-0">
              <img src={p.photoData} alt={p.caption ?? ""} className="w-full h-full object-cover" />
            </div>
          ))}
          {photosList.length > 6 && (
            <div className="w-14 h-14 rounded-md border border-border bg-muted flex items-center justify-center shrink-0">
              <span className="text-xs text-muted-foreground font-medium">+{photosList.length - 6}</span>
            </div>
          )}
        </div>
      )}

      {/* Tasks preview */}
      {tasksList.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tasks to copy</p>
          <div className="space-y-0.5 max-h-24 overflow-y-auto">
            {tasksList.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center gap-1.5 text-xs text-foreground/80">
                <CheckSquare className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{t.title}</span>
                {t.priority === "high" && <Badge className="text-[9px] py-0 px-1 bg-red-100 text-red-700 ml-auto">High</Badge>}
              </div>
            ))}
            {tasksList.length > 6 && <p className="text-xs text-muted-foreground pl-5">+{tasksList.length - 6} more tasks</p>}
          </div>
        </div>
      )}

      {/* Equipment preview */}
      {equipList.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Equipment to copy</p>
          <div className="space-y-0.5 max-h-20 overflow-y-auto">
            {equipList.slice(0, 4).map((e) => (
              <div key={e.id} className="flex items-center gap-1.5 text-xs text-foreground/80">
                <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{e.name}</span>
                <span className="text-muted-foreground ml-auto shrink-0">×{e.quantity}</span>
              </div>
            ))}
            {equipList.length > 4 && <p className="text-xs text-muted-foreground pl-5">+{equipList.length - 4} more items</p>}
          </div>
        </div>
      )}

      {/* Notes */}
      {job.notes && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</p>
          <p className="text-xs text-foreground/70 line-clamp-3 whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}

      <p className="text-xs text-primary/80 font-medium border-t border-primary/20 pt-2">
        ✓ Location, scope, notes, tasks &amp; equipment will be copied to the new job.
      </p>
    </div>
  );
}

// ─── Template selector ────────────────────────────────────────────────────────

function TemplateSelector({
  jobs,
  selectedId,
  onSelect,
}: {
  jobs: any[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const grouped = {
    completed: jobs.filter((j) => j.status === "completed"),
    in_progress: jobs.filter((j) => j.status === "in_progress"),
    scheduled: jobs.filter((j) => j.status === "scheduled"),
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); if (open && selectedId) onSelect(null); }}
          className="flex items-center gap-2 text-sm text-primary font-medium hover:underline focus:outline-none"
        >
          <Copy className="h-4 w-4" />
          Use a previous job as template
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {selectedId && (
          <Badge className="bg-primary/10 text-primary text-xs border-0">Template selected</Badge>
        )}
      </div>

      {open && (
        <Select
          value={selectedId ? String(selectedId) : ""}
          onValueChange={(v) => onSelect(v ? parseInt(v) : null)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a previous job to copy from…" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {grouped.completed.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completed</div>
                {grouped.completed.map((j) => (
                  <SelectItem key={j.id} value={String(j.id)}>
                    <div className="flex flex-col">
                      <span>{j.title}</span>
                      <span className="text-xs text-muted-foreground">{j.location}</span>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
            {grouped.in_progress.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">In Progress</div>
                {grouped.in_progress.map((j) => (
                  <SelectItem key={j.id} value={String(j.id)}>
                    <div className="flex flex-col">
                      <span>{j.title}</span>
                      <span className="text-xs text-muted-foreground">{j.location}</span>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
            {grouped.scheduled.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scheduled</div>
                {grouped.scheduled.map((j) => (
                  <SelectItem key={j.id} value={String(j.id)}>
                    <div className="flex flex-col">
                      <span>{j.title}</span>
                      <span className="text-xs text-muted-foreground">{j.location}</span>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ─── Create Job Dialog ────────────────────────────────────────────────────────

function CreateJobDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createJob = useCreateJob();
  const createTask = useCreateTask();
  const createEquipment = useCreateEquipment();

  const [templateJobId, setTemplateJobId] = useState<number | null>(null);
  const { data: allJobs } = useListJobs();
  const { data: templateTasks } = useListJobTasks(templateJobId!, { query: { enabled: !!templateJobId } });
  const { data: templateEquipment } = useListJobEquipment(templateJobId!, { query: { enabled: !!templateJobId } });

  const form = useForm<CreateJobValues>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      title: "",
      location: "",
      scope: "",
      status: "scheduled",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      notes: "",
    },
  });

  const handleTemplateApply = (data: { location: string; scope: string; notes: string }) => {
    form.setValue("location", data.location);
    form.setValue("scope", data.scope);
    if (data.notes) form.setValue("notes", data.notes);
  };

  const handleClearTemplate = () => {
    setTemplateJobId(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      form.reset({
        title: "", location: "", scope: "", status: "scheduled",
        startDate: new Date().toISOString().split("T")[0], endDate: "", notes: "",
      });
      setTemplateJobId(null);
    }
    onOpenChange(v);
  };

  const onSubmit = (values: CreateJobValues) => {
    createJob.mutate({
      data: {
        ...values,
        endDate: values.endDate || undefined,
        notes: values.notes || undefined,
      },
    }, {
      onSuccess: async (newJob: any) => {
        const newJobId = newJob.id;

        // Copy tasks from template
        if (templateJobId && templateTasks && templateTasks.length > 0) {
          await Promise.all(
            templateTasks.map((t) =>
              createTask.mutateAsync({
                jobId: newJobId,
                data: {
                  title: t.title,
                  description: t.description ?? undefined,
                  status: "pending",
                  priority: t.priority ?? "normal",
                  assignedToId: undefined,
                  dueDate: undefined,
                },
              }).catch(() => {})
            )
          );
        }

        // Copy equipment from template
        if (templateJobId && templateEquipment && templateEquipment.length > 0) {
          await Promise.all(
            templateEquipment.map((e) =>
              createEquipment.mutateAsync({
                jobId: newJobId,
                data: {
                  name: e.name,
                  quantity: e.quantity,
                  notes: e.notes ?? undefined,
                  status: "needed",
                },
              }).catch(() => {})
            )
          );
        }

        const copiedSummary = templateJobId
          ? ` · ${templateTasks?.length ?? 0} tasks and ${templateEquipment?.length ?? 0} equipment items copied.`
          : "";

        toast({
          title: "Job Created",
          description: `The job has been successfully created.${copiedSummary}`,
        });
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUpcomingJobsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        handleClose(false);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create job. Please try again.", variant: "destructive" });
      },
    });
  };

  // Jobs available as templates (all jobs except current - all are valid)
  const templateJobs = allJobs ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="font-semibold shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> New Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90dvh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="text-xl">Create New Job</DialogTitle>
          <DialogDescription>Enter the details for the new job site.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-5 space-y-5">
            {/* Template selector */}
            {templateJobs.length > 0 && (
              <>
                <TemplateSelector
                  jobs={templateJobs}
                  selectedId={templateJobId}
                  onSelect={setTemplateJobId}
                />
                {templateJobId && (
                  <TemplatePreview
                    jobId={templateJobId}
                    onClear={handleClearTemplate}
                    onApply={handleTemplateApply}
                  />
                )}
                <Separator />
              </>
            )}

            {/* Job form */}
            <Form {...form}>
              <form id="create-job-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title *</FormLabel>
                    <FormControl><Input placeholder="E.g., Downtown Office Renovation" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <FormControl><Input placeholder="E.g., 123 Main St, Austin TX" {...field} /></FormControl>
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
                      <FormLabel>End Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="scope" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope of Work *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description of what needs to be done…" className="resize-none h-20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Textarea placeholder="Special instructions, site access codes, contact info…" className="resize-none h-16" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </form>
            </Form>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2 shrink-0 bg-muted/20">
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button type="submit" form="create-job-form" disabled={createJob.isPending}>
            {createJob.isPending ? "Creating…" : templateJobId ? "Create from Template" : "Create Job"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Jobs list page ───────────────────────────────────────────────────────────

export default function JobsList() {
  const { data: jobs, isLoading } = useListJobs();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">Manage all operations and job sites.</p>
        </div>
        <CreateJobDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border shadow-sm">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-4">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !jobs || jobs.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="p-12 text-center text-muted-foreground">
            <div className="bg-secondary/50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No jobs found</h3>
            <p>Get started by creating your first job site.</p>
            <Button onClick={() => setIsCreateOpen(true)} className="mt-6 font-semibold" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Create Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="h-full cursor-pointer hover:border-primary/50 hover:shadow-md transition-all border-border shadow-sm group">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors leading-tight pr-4">
                    {job.title}
                  </CardTitle>
                  <StatusBadge status={job.status} />
                </CardHeader>
                <CardContent className="pb-6 space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start text-muted-foreground">
                      <MapPin className="mr-2 h-4 w-4 shrink-0 text-primary mt-0.5" />
                      <span className="leading-snug">{job.location}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground font-medium rounded-sm">
                      Starts: {formatDate(job.startDate)}
                    </Badge>
                    {job.endDate && (
                      <Badge variant="outline" className="border-border text-muted-foreground font-medium rounded-sm">
                        Ends: {formatDate(job.endDate)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
