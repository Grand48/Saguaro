import { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { useParams, Link } from "wouter";
import { 
  useGetJob, getGetJobQueryKey,
  useUpdateJob,
  useDeleteJob, getListJobsQueryKey,
  useListJobTasks, getListJobTasksQueryKey,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListJobMessages, getListJobMessagesQueryKey,
  useSendMessage,
  useListJobPhotos, getListJobPhotosQueryKey,
  useUploadPhoto,
  useListCrew,
  useAssignCrewToJob,
  useRemoveCrewFromJob,
  useListJobEquipment, getListJobEquipmentQueryKey,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  useListJobContacts, getListJobContactsQueryKey,
  useCreateJobContact,
  useUpdateJobContact,
  useDeleteJobContact,
  useGetLocation, getGetLocationQueryKey,
  getGetUpcomingJobsQueryKey,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDateTime } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, Calendar as CalendarIcon, FileText, CheckSquare, 
  MessageSquare, Camera, Users, Plus, Trash2, Send, Paperclip, X, Wrench, Package, Phone, Mail, Edit2,
  PenLine, ClipboardCheck, CheckCircle2, Circle, ChevronDown, ChevronRight, Copy, Upload
} from "lucide-react";
import {
  useListJobForms,
  useCreateJobForm,
  useSubmitJobForm,
  useDeleteJobForm,
  getListJobFormsQueryKey,
} from "@workspace/api-client-react";

export default function JobDetail() {
  const { id } = useParams();
  const jobId = parseInt(id || "0", 10);
  
  const { data: job, isLoading, error } = useGetJob(jobId, { 
    query: { enabled: !!jobId, queryKey: getGetJobQueryKey(jobId) } 
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-destructive">Job Not Found</h2>
        <p className="text-muted-foreground mt-2">The job you're looking for doesn't exist or you don't have permission to view it.</p>
        <Button asChild className="mt-6">
          <Link href="/jobs">Back to Jobs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-card border border-border p-6 rounded-lg shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
            <StatusBadge status={job.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span>{formatDate(job.startDate)} {job.endDate ? `- ${formatDate(job.endDate)}` : ""}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UpdateJobDialog job={job} />
          <DeleteJobDialog jobId={job.id} jobTitle={job.title} />
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-8 w-full h-auto p-1 bg-muted/50 rounded-md">
          <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"><FileText className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Overview</span></TabsTrigger>
          <TabsTrigger value="crew" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"><Users className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Crew</span></TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"><CheckSquare className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Tasks</span></TabsTrigger>
          <TabsTrigger value="equipment" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"><Wrench className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Equipment</span></TabsTrigger>
          <TabsTrigger value="contacts" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"><Phone className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Contacts</span></TabsTrigger>
          <TabsTrigger value="chat" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"><MessageSquare className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Chat</span></TabsTrigger>
          <TabsTrigger value="photos" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"><Camera className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Photos</span></TabsTrigger>
          <TabsTrigger value="forms" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"><PenLine className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Forms</span></TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="overview" className="space-y-6 outline-none focus-visible:ring-0">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <CardTitle className="text-lg">Scope of Work</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{job.scope}</p>
              </CardContent>
            </Card>
            
            {job.notes && (
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3 border-b border-border bg-muted/20">
                  <CardTitle className="text-lg">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{job.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="crew" className="outline-none focus-visible:ring-0">
            <JobCrewTab jobId={jobId} currentCrew={job.crew} />
          </TabsContent>

          <TabsContent value="tasks" className="outline-none focus-visible:ring-0">
            <JobTasksTab jobId={jobId} crew={job.crew} />
          </TabsContent>

          <TabsContent value="equipment" className="outline-none focus-visible:ring-0">
            <JobEquipmentTab jobId={jobId} />
          </TabsContent>

          <TabsContent value="contacts" className="outline-none focus-visible:ring-0">
            <JobContactsTab jobId={jobId} />
          </TabsContent>

          <TabsContent value="chat" className="outline-none focus-visible:ring-0">
            <JobChatTab jobId={jobId} />
          </TabsContent>

          <TabsContent value="photos" className="outline-none focus-visible:ring-0">
            <JobPhotosTab jobId={jobId} />
          </TabsContent>

          <TabsContent value="forms" className="outline-none focus-visible:ring-0">
            <JobFormsTab jobId={jobId} jobName={job?.name ?? ""} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STATUS BADGE COMPONENT
// -----------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "scheduled":
      return <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 uppercase text-[10px] tracking-wider font-bold shrink-0">Scheduled</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 uppercase text-[10px] tracking-wider font-bold shrink-0">In Progress</Badge>;
    case "completed":
      return <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 uppercase text-[10px] tracking-wider font-bold shrink-0">Completed</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800 uppercase text-[10px] tracking-wider font-bold shrink-0">Cancelled</Badge>;
    default:
      return <Badge variant="outline" className="uppercase text-[10px] tracking-wider font-bold shrink-0">{status}</Badge>;
  }
}

// -----------------------------------------------------------------------------
// UPDATE JOB DIALOG
// -----------------------------------------------------------------------------

const updateJobSchema = z.object({
  title: z.string().min(1, "Title is required"),
  location: z.string().min(1, "Location is required"),
  scope: z.string().min(1, "Scope is required"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

function UpdateJobDialog({ job }: { job: any }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateJob = useUpdateJob();
  
  const form = useForm<z.infer<typeof updateJobSchema>>({
    resolver: zodResolver(updateJobSchema),
    defaultValues: {
      title: job.title,
      location: job.location,
      scope: job.scope,
      status: job.status,
      startDate: job.startDate,
      endDate: job.endDate || "",
      notes: job.notes || "",
    },
  });

  const onSubmit = (values: z.infer<typeof updateJobSchema>) => {
    updateJob.mutate({
      id: job.id,
      data: {
        ...values,
        endDate: values.endDate || undefined,
        notes: values.notes || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Job Updated", description: "Job details have been saved." });
        queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(job.id) });
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit Job</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Job: {job.title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <FormItem><FormLabel>Scope</FormLabel><FormControl><Textarea className="h-20" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateJob.isPending}>{updateJob.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// DELETE JOB DIALOG
// -----------------------------------------------------------------------------

function DeleteJobDialog({ jobId, jobTitle }: { jobId: number; jobTitle: string }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteJob = useDeleteJob();

  const handleDelete = () => {
    deleteJob.mutate({ id: jobId }, {
      onSuccess: () => {
        toast({ title: "Job Deleted", description: "The job has been removed." });
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUpcomingJobsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        window.location.href = "/jobs"; // Navigate back
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-0">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Job</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{jobTitle}"? This action cannot be undone and will delete all tasks, photos, and messages associated with this job.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteJob.isPending}>
            {deleteJob.isPending ? "Deleting..." : "Delete Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// CREW TAB
// -----------------------------------------------------------------------------

function JobCrewTab({ jobId, currentCrew }: { jobId: number, currentCrew: any[] }) {
  const { data: allCrew, isLoading } = useListCrew();
  const queryClient = useQueryClient();
  const assignCrew = useAssignCrewToJob();
  const removeCrew = useRemoveCrewFromJob();
  const { toast } = useToast();

  const currentCrewIds = new Set(currentCrew.map(c => c.id));
  const availableCrew = allCrew?.filter(c => !currentCrewIds.has(c.id)) || [];

  const handleAssign = (crewId: number) => {
    assignCrew.mutate({
      id: jobId,
      data: { crewIds: [...currentCrew.map(c => c.id), crewId] }
    }, {
      onSuccess: () => {
        toast({ title: "Crew Member Added", description: "Successfully added to the job." });
        queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });
      }
    });
  };

  const handleRemove = (crewId: number) => {
    removeCrew.mutate({
      id: jobId,
      crewId,
    }, {
      onSuccess: () => {
        toast({ title: "Crew Member Removed", description: "Successfully removed from the job." });
        queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });
      }
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="border-border shadow-sm h-fit">
        <CardHeader className="pb-3 border-b border-border bg-muted/20">
          <CardTitle className="text-lg flex justify-between items-center">
            Assigned Crew ({currentCrew.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {currentCrew.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No crew assigned to this job.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {currentCrew.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={member.avatarUrl || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(member.id)} disabled={removeCrew.isPending} className="text-muted-foreground hover:text-destructive h-8 w-8 p-0 rounded-full">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm h-fit">
        <CardHeader className="pb-3 border-b border-border bg-muted/20">
          <CardTitle className="text-lg">Available Crew</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : availableCrew.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>All available crew members are already assigned to this job.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {availableCrew.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={member.avatarUrl || ""} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold text-xs">
                        {member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => handleAssign(member.id)} disabled={assignCrew.isPending} className="h-8 text-xs font-semibold">
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TASKS TAB
// -----------------------------------------------------------------------------

function JobTasksTab({ jobId, crew }: { jobId: number, crew: any[] }) {
  const { data: tasks, isLoading } = useListJobTasks(jobId, { query: { enabled: !!jobId, queryKey: getListJobTasksQueryKey(jobId) } });
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { toast } = useToast();

  const handleToggleTask = (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    
    // Optimistic update
    queryClient.setQueryData(getListJobTasksQueryKey(jobId), (old: any) => {
      if (!old) return old;
      return old.map((t: any) => t.id === taskId ? { ...t, status: newStatus } : t);
    });

    updateTask.mutate({
      id: taskId,
      data: { status: newStatus as any }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) }); // Update overall job progress
      },
      onError: () => {
        queryClient.invalidateQueries({ queryKey: getListJobTasksQueryKey(jobId) });
        toast({ title: "Error", description: "Failed to update task status.", variant: "destructive" });
      }
    });
  };

  const handleDeleteTask = (taskId: number) => {
    deleteTask.mutate({ id: taskId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobTasksQueryKey(jobId) });
        queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  const completedCount = tasks?.filter((t) => t.status === "completed").length || 0;
  const totalCount = tasks?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 bg-card p-4 border border-border rounded-lg shadow-sm">
        <div className="w-full max-w-md">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-semibold">Task Progress</span>
            <span className="text-sm text-muted-foreground font-medium">{completedCount} of {totalCount} completed</span>
          </div>
          <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <CreateTaskDialog jobId={jobId} crew={crew} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-lg bg-card/50">
          <CheckSquare className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>No tasks created for this job yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${
                task.status === "completed" 
                  ? "bg-muted/30 border-muted text-muted-foreground" 
                  : "bg-card border-border shadow-sm hover:border-primary/30"
              }`}
            >
              <div className="pt-1">
                <Checkbox 
                  checked={task.status === "completed"} 
                  onCheckedChange={() => handleToggleTask(task.id, task.status)}
                  className="h-5 w-5 rounded-sm border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${task.status === "completed" ? "line-through" : "text-foreground"}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-sm mt-1">{task.description}</p>
                )}
                {task.assignedTo && (
                  <div className="flex items-center gap-1.5 mt-3">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.assignedTo.avatarUrl || ""} />
                      <AvatarFallback className="text-[9px] bg-secondary text-secondary-foreground">
                        {task.assignedTo.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">Assigned to: {task.assignedTo.name}</span>
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDeleteTask(task.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assignedToId: z.string().optional(), // store as string in form, convert to number
});

function CreateTaskDialog({ jobId, crew }: { jobId: number, crew: any[] }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  
  const form = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedToId: "unassigned",
    },
  });

  const onSubmit = (values: z.infer<typeof createTaskSchema>) => {
    const assignedToIdNum = values.assignedToId && values.assignedToId !== "unassigned" 
      ? parseInt(values.assignedToId, 10) 
      : undefined;

    createTask.mutate({
      id: jobId,
      data: {
        title: values.title,
        description: values.description || undefined,
        status: "pending",
        assignedToId: assignedToIdNum,
      } as any
    }, {
      onSuccess: () => {
        toast({ title: "Task Added", description: "New task added to the job." });
        queryClient.invalidateQueries({ queryKey: getListJobTasksQueryKey(jobId) });
        queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) }); // Update overall progress
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        form.reset();
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Task</FormLabel><FormControl><Input placeholder="What needs to be done?" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Details (Optional)</FormLabel><FormControl><Textarea className="h-20 resize-none" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="assignedToId" render={({ field }) => (
              <FormItem>
                <FormLabel>Assign To</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Anyone" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="unassigned">Anyone (Unassigned)</SelectItem>
                    {crew.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name} - {c.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createTask.isPending}>{createTask.isPending ? "Adding..." : "Add Task"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// CHAT TAB
// -----------------------------------------------------------------------------

function JobChatTab({ jobId }: { jobId: number }) {
  const { data: messages, isLoading } = useListJobMessages(jobId, { query: { enabled: !!jobId, queryKey: getListJobMessagesQueryKey(jobId) } });
  const queryClient = useQueryClient();
  const sendMessage = useSendMessage();
  const [content, setContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when messages load
  if (scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim()) return;

    sendMessage.mutate({
      id: jobId,
      data: {
        senderName: "Foreman",
        content: content.trim(),
      } as any
    }, {
      onSuccess: () => {
        setContent("");
        queryClient.invalidateQueries({ queryKey: getListJobMessagesQueryKey(jobId) });
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target?.result as string;
      
      sendMessage.mutate({
        id: jobId,
        data: {
          senderName: "Foreman",
          content: "Shared a photo",
          photoUrl: base64Str,
        } as any
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJobMessagesQueryKey(jobId) });
          queryClient.invalidateQueries({ queryKey: getListJobPhotosQueryKey(jobId) }); // Might show up in gallery
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-[600px] bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/20">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Crew Chat
        </h3>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-3/4 rounded-lg rounded-tl-none" />
            <Skeleton className="h-16 w-3/4 rounded-lg rounded-tr-none ml-auto" />
            <Skeleton className="h-24 w-1/2 rounded-lg rounded-tl-none" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-12">
            <MessageSquare className="h-12 w-12 mb-4" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-6 flex flex-col justify-end min-h-full">
            {messages.map((msg, i) => {
              const isMe = msg.senderName === "Foreman";
              const showHeader = i === 0 || messages[i-1].senderName !== msg.senderName || 
                (new Date(msg.createdAt).getTime() - new Date(messages[i-1].createdAt).getTime() > 1000 * 60 * 5);

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showHeader && (
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <span className="text-xs font-semibold text-foreground/80">{msg.senderName}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDateTime(msg.createdAt)}</span>
                    </div>
                  )}
                  <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                      isMe 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-secondary text-secondary-foreground rounded-tl-none border border-border/50'
                    }`}
                  >
                    {msg.photoUrl && (
                      <div className="mb-2 rounded-md overflow-hidden bg-black/10">
                        <img src={msg.photoUrl} alt="Attachment" className="max-h-60 w-auto object-contain" />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t border-border bg-card">
        <form onSubmit={handleSend} className="flex gap-2">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button 
            type="button" 
            variant="outline" 
            size="icon" 
            className="shrink-0 bg-muted/50 border-0 hover:bg-muted"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Input 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            placeholder="Message the crew..." 
            className="flex-1 bg-muted/50 border-0 focus-visible:ring-1"
          />
          <Button type="submit" size="icon" disabled={!content.trim() || sendMessage.isPending} className="shrink-0 rounded-full h-10 w-10">
            <Send className="h-4 w-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// PHOTOS TAB
// -----------------------------------------------------------------------------

function JobPhotosTab({ jobId }: { jobId: number }) {
  const { data: photos, isLoading } = useListJobPhotos(jobId, { query: { enabled: !!jobId, queryKey: getListJobPhotosQueryKey(jobId) } });
  const queryClient = useQueryClient();
  const uploadPhoto = useUploadPhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target?.result as string;
      
      // We need a prompt for caption, simulating with window.prompt for speed 
      // in a real app we'd use a dialog
      const caption = window.prompt("Enter a caption for this photo (optional):") || "";
      
      toast({ title: "Uploading...", description: "Photo is being uploaded." });

      uploadPhoto.mutate({
        id: jobId,
        data: {
          url: base64Str,
          caption: caption || undefined,
          uploadedBy: "Foreman",
        } as any
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJobPhotosQueryKey(jobId) });
          toast({ title: "Success", description: "Photo uploaded to gallery." });
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border shadow-sm">
        <div>
          <h3 className="font-semibold">Site Gallery</h3>
          <p className="text-sm text-muted-foreground">Photos and documents from the job site.</p>
        </div>
        <div>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button onClick={() => fileInputRef.current?.click()} className="font-semibold shadow-sm">
            <Camera className="h-4 w-4 mr-2" /> Upload Photo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="aspect-square rounded-lg" />)}
        </div>
      ) : !photos || photos.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground border border-dashed border-border rounded-lg bg-card/50">
          <Camera className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium text-foreground mb-1">No photos yet</p>
          <p className="text-sm">Upload photos of the site, progress, or completed work.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-card shadow-sm cursor-zoom-in">
              <img 
                src={photo.url} 
                alt={photo.caption || "Job photo"} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                <p className="text-white text-sm font-medium leading-tight line-clamp-2">
                  {photo.caption || "Untitled"}
                </p>
                <p className="text-white/70 text-[10px] mt-1 flex justify-between">
                  <span>By {photo.uploadedBy}</span>
                  <span>{formatDate(photo.createdAt)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// EQUIPMENT TAB
// -----------------------------------------------------------------------------

const EQUIPMENT_STATUSES = [
  { value: "needed", label: "Needed", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "reserved", label: "Reserved", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "on_site", label: "On Site", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "returned", label: "Returned", color: "bg-slate-100 text-slate-700 border-slate-200" },
];

function EquipmentStatusBadge({ status }: { status: string }) {
  const s = EQUIPMENT_STATUSES.find(x => x.value === status);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${s?.color ?? "bg-muted text-muted-foreground border-border"}`}>
      {s?.label ?? status}
    </span>
  );
}

function JobEquipmentTab({ jobId }: { jobId: number }) {
  const { data: items, isLoading } = useListJobEquipment(jobId, {
    query: { enabled: !!jobId, queryKey: getListJobEquipmentQueryKey(jobId) }
  });
  const queryClient = useQueryClient();
  const updateEquipment = useUpdateEquipment();
  const deleteEquipmentItem = useDeleteEquipment();
  const { toast } = useToast();

  const handleStatusChange = (itemId: number, newStatus: string) => {
    updateEquipment.mutate({ id: itemId, data: { status: newStatus as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobEquipmentQueryKey(jobId) });
      },
      onError: () => toast({ title: "Error", description: "Failed to update status.", variant: "destructive" }),
    });
  };

  const handleDelete = (itemId: number) => {
    deleteEquipmentItem.mutate({ id: itemId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobEquipmentQueryKey(jobId) });
        toast({ title: "Removed", description: "Equipment item removed." });
      },
    });
  };

  const needed = items?.filter(i => i.status === "needed") || [];
  const onSite = items?.filter(i => i.status === "on_site") || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border shadow-sm">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Equipment Requirements
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items?.length ?? 0} item{(items?.length ?? 0) !== 1 ? "s" : ""} — {needed.length} needed, {onSite.length} on site
          </p>
        </div>
        <AddEquipmentDialog jobId={jobId} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground border border-dashed border-border rounded-lg bg-card/50">
          <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium text-foreground mb-1">No equipment listed</p>
          <p className="text-sm">Add tools, machinery, or materials needed for this job.</p>
        </div>
      ) : (
        <Card className="border-border shadow-sm">
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 group hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{item.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      Qty: {item.quantity}
                    </span>
                    <EquipmentStatusBadge status={item.status} />
                  </div>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={item.status} onValueChange={(val) => handleStatusChange(item.id, val)}>
                    <SelectTrigger className="h-8 w-[110px] text-xs border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

const addEquipmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z.coerce.number().int().min(1, "At least 1").default(1),
  notes: z.string().optional(),
  status: z.enum(["needed", "reserved", "on_site", "returned"]).default("needed"),
});

function AddEquipmentDialog({ jobId }: { jobId: number }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createEquipment = useCreateEquipment();

  const form = useForm<z.infer<typeof addEquipmentSchema>>({
    resolver: zodResolver(addEquipmentSchema),
    defaultValues: { name: "", quantity: 1, notes: "", status: "needed" },
  });

  const onSubmit = (values: z.infer<typeof addEquipmentSchema>) => {
    createEquipment.mutate({
      id: jobId,
      data: {
        name: values.name,
        quantity: values.quantity,
        notes: values.notes || undefined,
        status: values.status,
      } as any,
    }, {
      onSuccess: () => {
        toast({ title: "Equipment Added", description: `${values.name} added to the list.` });
        queryClient.invalidateQueries({ queryKey: getListJobEquipmentQueryKey(jobId) });
        form.reset({ name: "", quantity: 1, notes: "", status: "needed" });
        setOpen(false);
      },
      onError: () => toast({ title: "Error", description: "Failed to add equipment.", variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Add Equipment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Equipment Requirement</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Equipment Name</FormLabel>
                <FormControl><Input placeholder="e.g. Scaffold Tower, Jackhammer, PPE Kit" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl><Input type="number" min={1} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {EQUIPMENT_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Textarea className="h-16 resize-none" placeholder="Rental source, specs, or special instructions" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createEquipment.isPending}>
                {createEquipment.isPending ? "Adding..." : "Add Equipment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Job Contacts Tab ─────────────────────────────────────────────────────────

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});
type ContactFormData = z.infer<typeof contactSchema>;

function ContactDialog({
  jobId,
  contact,
  trigger,
}: {
  jobId: number;
  contact?: any;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createContact = useCreateJobContact();
  const updateContact = useUpdateJobContact();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name ?? "",
      role: contact?.role ?? "",
      phone: contact?.phone ?? "",
      email: contact?.email ?? "",
      notes: contact?.notes ?? "",
    },
  });

  const handleOpen = (val: boolean) => {
    if (val) {
      form.reset({
        name: contact?.name ?? "",
        role: contact?.role ?? "",
        phone: contact?.phone ?? "",
        email: contact?.email ?? "",
        notes: contact?.notes ?? "",
      });
    }
    setOpen(val);
  };

  const onSubmit = (data: ContactFormData) => {
    const payload = {
      name: data.name,
      role: data.role,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
    };

    if (contact) {
      updateContact.mutate({ id: contact.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJobContactsQueryKey(jobId) });
          toast({ title: "Contact updated" });
          setOpen(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to update contact.", variant: "destructive" }),
      });
    } else {
      createContact.mutate({ jobId, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJobContactsQueryKey(jobId) });
          toast({ title: "Contact added" });
          setOpen(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to add contact.", variant: "destructive" }),
      });
    }
  };

  const isPending = createContact.isPending || updateContact.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          <DialogDescription>
            {contact ? "Update the contact details." : "Add a point of contact for this job."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="Full name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Role / Title</FormLabel>
                <FormControl><Input placeholder="e.g. Site Manager, Client, Inspector" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Input placeholder="(555) 000-0000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Input placeholder="name@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Textarea className="h-16 resize-none" placeholder="Any additional info about this contact" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (contact ? "Saving..." : "Adding...") : (contact ? "Save Changes" : "Add Contact")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function JobContactsTab({ jobId }: { jobId: number }) {
  const { data: contacts, isLoading } = useListJobContacts(jobId, {
    query: { enabled: !!jobId, queryKey: getListJobContactsQueryKey(jobId) }
  });
  const queryClient = useQueryClient();
  const deleteContact = useDeleteJobContact();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deleteContact.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobContactsQueryKey(jobId) });
        toast({ title: "Contact removed" });
      },
      onError: () => toast({ title: "Error", description: "Failed to remove contact.", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border shadow-sm">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Job Contacts
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {contacts?.length ?? 0} contact{(contacts?.length ?? 0) !== 1 ? "s" : ""} — clients, inspectors, subcontractors
          </p>
        </div>
        <ContactDialog
          jobId={jobId}
          trigger={
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Contact
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : !contacts || contacts.length === 0 ? (
        <div className="p-16 text-center text-muted-foreground border border-dashed border-border rounded-lg bg-card/50">
          <Phone className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium text-foreground mb-1">No contacts yet</p>
          <p className="text-sm">Add clients, inspectors, or subcontractors for quick reference.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((contact) => (
            <Card key={contact.id} className="border-border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {contact.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{contact.name}</p>
                      <p className="text-xs text-primary font-medium mt-0.5">{contact.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <ContactDialog
                      jobId={jobId}
                      contact={contact}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(contact.id)}
                      disabled={deleteContact.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {(contact.phone || contact.email) && (
                  <div className="mt-3 space-y-1.5 pl-[52px]">
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                      >
                        <Phone className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate group-hover:underline">{contact.phone}</span>
                      </a>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                      >
                        <Mail className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate group-hover:underline">{contact.email}</span>
                      </a>
                    )}
                  </div>
                )}

                {contact.notes && (
                  <p className="mt-2 pl-[52px] text-xs text-muted-foreground line-clamp-2">{contact.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// JOB FORMS TAB
// -----------------------------------------------------------------------------

const JOB_COMPLETION_FIELDS = [
  { key: "work_description", label: "Description of work completed", type: "textarea" },
  { key: "materials_used", label: "Materials used", type: "textarea" },
  { key: "issues_notes", label: "Issues or notes", type: "textarea" },
  { key: "client_present", label: "Client / customer present on site?", type: "yesno" },
  { key: "walkthrough_completed", label: "Final walkthrough completed?", type: "yesno" },
  { key: "site_cleaned", label: "Site cleaned and secured?", type: "yesno" },
] as const;

const QC_CHECKLIST_ITEMS = [
  { key: "chk_pre_job_photo", label: "Pre job photo" },
  { key: "chk_splice_kit_material_photos", label: "Splice kit material photos" },
  { key: "chk_center_line_photo", label: "Center line photo" },
  { key: "chk_finger_cable_lap_lengths", label: "Finger / cable / lap lengths" },
  { key: "chk_every_laying_step", label: "Every laying step of the splice" },
  { key: "chk_temp_wires", label: "Temp wires" },
  { key: "chk_edge_irons", label: "Edge irons" },
  { key: "chk_vulcanizer_pressure", label: "Vulcanizer pressure" },
  { key: "chk_vulcanizer_power", label: "Vulcanizer power" },
  { key: "chk_finished_splice", label: "Finished splice" },
  { key: "chk_durometer_readings", label: "Durometer readings" },
  { key: "chk_work_area_after", label: "Work area after completed work" },
];
const QC_SPLICE_SECTIONS: Array<{ title: string; fields: Array<{ key: string; label: string; type: string; options?: string[] }> }> = [
  { title: "Belt Information", fields: [
    { key: "belt_new_or_used", label: "New or used belt", type: "select", options: ["New", "Used"] },
    { key: "splice_or_new_install", label: "Resplice or new install", type: "select", options: ["Resplice", "New Install"] },
    { key: "belt_manufacture", label: "Belt manufacturer", type: "text" },
    { key: "belt_width", label: "Belt width", type: "text" },
    { key: "belt_thickness", label: "Belt thickness", type: "text" },
    { key: "piw_or_st", label: "PIW or ST", type: "select", options: ["PIW", "ST"] },
  ]},
  { title: "Splice Details", fields: [
    { key: "splice_type", label: "Splice type", type: "select", options: ["Lap", "Finger", "Cable"] },
    { key: "splice_length", label: "Splice length", type: "text" },
    { key: "step_length", label: "Step length", type: "text" },
    { key: "cable_stage", label: "Cable stage", type: "text" },
    { key: "nel_length", label: "NEL length", type: "text" },
  ]},
  { title: "Cover & Dimensions", fields: [
    { key: "top_cover_thickness", label: "Top cover thickness", type: "text" },
    { key: "bottom_cover_thickness", label: "Bottom cover thickness", type: "text" },
    { key: "edge_iron_thickness", label: "Edge iron thickness", type: "text" },
  ]},
  { title: "Equipment & Setup", fields: [
    { key: "take_up_type", label: "Take up type", type: "select", options: ["Gravity", "Screw", "Hydraulic"] },
    { key: "take_up_length", label: "Length of take up", type: "text" },
    { key: "can_pull_up", label: "Can it be pulled up and spliced?", type: "yesno" },
    { key: "cook_temp", label: "Required cook temp", type: "text" },
    { key: "splice_pressure", label: "Required splice pressure", type: "text" },
    { key: "vulcanizer_type", label: "Vulcanizer type", type: "text" },
    { key: "water_source", label: "Water source", type: "text" },
    { key: "power_source", label: "Power source", type: "text" },
  ]},
  { title: "Materials & Expiration", fields: [
    { key: "splice_rubber_manufacture", label: "Splice rubber manufacturer", type: "text" },
    { key: "top_cover_exp", label: "Top cover expiration", type: "date" },
    { key: "bottom_cover_exp", label: "Bottom cover expiration", type: "date" },
    { key: "inside_gum_exp", label: "Inside gum expiration", type: "date" },
    { key: "noodle_exp", label: "Noodle expiration", type: "date" },
    { key: "glue_exp", label: "Glue expiration", type: "date" },
    { key: "cleaner_exp", label: "Cleaner expiration", type: "date" },
  ]},
  { title: "Quality & Sign-off", fields: [
    { key: "white_rubber", label: "Splice marked with white rubber?", type: "yesno" },
    { key: "porosity", label: "Porosity?", type: "yesno" },
    { key: "lead_splicer", label: "Lead splicer / date", type: "text" },
  ]},
];
const TIME_INTERVALS = [0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100];
const TIME_LOG_COLS = [
  { key: "p1t", label: "Platen #1 Top" },
  { key: "p1b", label: "Platen #1 Bottom" },
  { key: "psi1", label: "PSI" },
  { key: "p2t", label: "Platen #2 Top" },
  { key: "p2b", label: "Platen #2 Bottom" },
  { key: "psi2", label: "PSI" },
];
const QC_FIELDS: readonly { key: string; label: string; type: string }[] = [];

const SWP_GENERAL_FIELDS = [
  { key: "monthly_safety_focus", label: "Monthly safety focus" },
  { key: "emergency_job_number", label: "Emergency job number" },
  { key: "date_and_shift", label: "Date and shift" },
  { key: "competent_person", label: "Competent person" },
  { key: "site_job_number", label: "Site and job number" },
  { key: "immediate_work_area", label: "Immediate work area" },
];
const SWP_HAZARD_ITEMS = [
  { key: "swp_confined_space", label: "Confined space" },
  { key: "swp_working_at_heights", label: "Working at heights" },
  { key: "swp_hazardous_substances", label: "Hazardous substances / chemicals" },
  { key: "swp_mobile_equipment", label: "Mobile equipment" },
  { key: "swp_slips_trips_falls", label: "Slips / trips / falls" },
  { key: "swp_ladder_use", label: "Ladder use" },
  { key: "swp_repetitive_motion", label: "Repetitive motion" },
  { key: "swp_awkward_position", label: "Awkward position" },
  { key: "swp_hand_power_tools", label: "Hand and power tools" },
  { key: "swp_spotter_goals", label: "Spotter / goals" },
  { key: "swp_lototo", label: "LOTOTO required" },
  { key: "swp_ground_support", label: "Ground support" },
  { key: "swp_lifting_operations", label: "Lifting operations" },
  { key: "swp_rigging_capacity", label: "Rigging capacity" },
  { key: "swp_lift_capacity", label: "Lift capacity" },
  { key: "swp_signs_barricades", label: "Signs and barricades" },
  { key: "swp_pinch_points", label: "Pinch points" },
  { key: "swp_weather_related", label: "Weather related" },
  { key: "swp_lighting", label: "Lighting / illumination" },
  { key: "swp_ventilation", label: "Ventilation" },
  { key: "swp_escapeways", label: "Escapeways / refuge chamber" },
  { key: "swp_health_hazards", label: "Health hazards" },
  { key: "swp_noise_exposure", label: "Noise exposure" },
];
const SWP_PERMIT_FIELDS = [
  { key: "swp_respiratory", label: "Respiratory hazards (respirator required)?" },
  { key: "swp_cut_gear", label: "Cut gear required?" },
  { key: "swp_hot_work", label: "Hot work permit?" },
  { key: "swp_heights_permit", label: "Working at heights permit?" },
  { key: "swp_confined_space_permit", label: "Confined space permit?" },
  { key: "swp_additional_permits", label: "Additional permits required?" },
  { key: "swp_scaffolding", label: "Scaffolding required?" },
];
const SWP_HA_ROWS = 5;

type FormType = "job_completion" | "quality_control" | "custom" | "safe_work_permit";
type JobFormRecord = {
  id: number; jobId: number; formType: FormType; status: "draft" | "signed";
  fields?: string | null; signatureName?: string | null; signatureData?: string | null;
  customFormName?: string | null; customFormData?: string | null;
  signedByCrewId?: number | null; signedAt?: string | null; createdAt: string;
  signedByCrew?: { id: number; name: string } | null;
};

function buildFormSummaryText(form: JobFormRecord, jobName: string): string {
  const typeLabel = form.formType === "job_completion" ? "Job Completion Form"
    : form.formType === "quality_control" ? "Quality Control Checklist"
    : form.formType === "safe_work_permit" ? "Safe Work Permit"
    : form.customFormName ?? "Uploaded Form";
  const parsed = form.fields ? JSON.parse(form.fields) as Record<string, string> : {};
  const lines = [
    `${typeLabel.toUpperCase()}`,
    `Job: ${jobName}`,
    `Signed by: ${form.signatureName}`,
    `Date: ${form.signedAt ? new Date(form.signedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}`,
    "",
  ];
  if (form.formType === "quality_control") {
    lines.push("--- CHECKLIST ---");
    for (const item of QC_CHECKLIST_ITEMS) {
      lines.push(`${parsed[item.key] === "true" ? "[✓]" : "[ ]"} ${item.label}`);
    }
    lines.push("", "--- SPLICE INFORMATION ---");
    for (const section of QC_SPLICE_SECTIONS) {
      const filled = section.fields.filter((f) => parsed[f.key]);
      if (filled.length > 0) {
        lines.push(`\n[${section.title}]`);
        for (const f of filled) {
          const v = parsed[f.key];
          lines.push(`${f.label}: ${v === "yes" ? "Yes" : v === "no" ? "No" : v}`);
        }
      }
    }
    lines.push("", "--- TEMPERATURE & PRESSURE LOG ---");
    if (parsed["tl_start_time"]) lines.push(`Start Time: ${parsed["tl_start_time"]}`);
    if (parsed["tl_end_time"]) lines.push(`End Time: ${parsed["tl_end_time"]}`);
    const header = ["Min", ...TIME_LOG_COLS.map((c) => c.label)].join(" | ");
    lines.push(header);
    for (const min of TIME_INTERVALS) {
      const row = [String(min), ...TIME_LOG_COLS.map((c) => parsed[`tl_${min}_${c.key}`] ?? "")].join(" | ");
      lines.push(row);
    }
  } else if (form.formType === "safe_work_permit") {
    lines.push("--- GENERAL INFORMATION ---");
    for (const f of SWP_GENERAL_FIELDS) {
      if (parsed[f.key]) lines.push(`${f.label}: ${parsed[f.key]}`);
    }
    lines.push("", "--- HAZARDS IDENTIFIED ---");
    if (parsed["swp_are_lifting"]) lines.push(`Lifting today: ${parsed["swp_are_lifting"] === "yes" ? "Yes" : "No"}`);
    if (parsed["swp_lift_weight"]) lines.push(`Lift weight: ${parsed["swp_lift_weight"]} lbs`);
    const checkedHazards = SWP_HAZARD_ITEMS.filter((h) => parsed[h.key] === "true").map((h) => h.label);
    if (checkedHazards.length) lines.push("Active hazards: " + checkedHazards.join(", "));
    lines.push("", "--- PERMITS & REQUIREMENTS ---");
    for (const f of SWP_PERMIT_FIELDS) {
      if (parsed[f.key]) lines.push(`${f.label} ${parsed[f.key] === "yes" ? "YES" : "NO"}`);
    }
    lines.push("", "--- HAZARD ANALYSIS ---");
    for (let i = 0; i < SWP_HA_ROWS; i++) {
      const area = parsed[`ha_area_${i}`]; const haz = parsed[`ha_hazards_${i}`]; const mit = parsed[`ha_mitigation_${i}`];
      if (area || haz || mit) lines.push(`[${i + 1}] Area: ${area || "—"} | Hazards: ${haz || "—"} | Controls: ${mit || "—"}`);
    }
    lines.push("", "--- EMPLOYEE ACKNOWLEDGMENTS ---");
    try {
      const sigs: { name: string; date: string }[] = JSON.parse(parsed["employee_sigs"] ?? "[]");
      if (sigs.length) { for (const s of sigs) lines.push(`${s.name} — ${s.date}`); }
      else { lines.push("No employee acknowledgments yet."); }
    } catch { lines.push("No employee acknowledgments yet."); }
  } else if (form.formType === "job_completion") {
    lines.push("--- Form Details ---");
    for (const fd of JOB_COMPLETION_FIELDS) {
      const val = parsed[fd.key as string];
      lines.push(`${fd.label}: ${val === "yes" ? "Yes ✓" : val === "no" ? "No ✗" : val || "—"}`);
    }
  } else {
    lines.push(`Attached form: ${form.customFormName ?? "uploaded file"}`);
  }
  lines.push("", "Signed electronically via Saguaro.");
  return lines.join("\n");
}

function buildEmailLink(form: JobFormRecord, jobName: string): string {
  const typeLabel = form.formType === "job_completion" ? "Job Completion Form"
    : form.formType === "quality_control" ? "Quality Control Checklist"
    : form.formType === "safe_work_permit" ? "Safe Work Permit"
    : form.customFormName ?? "Uploaded Form";
  const subject = encodeURIComponent(`Signed: ${typeLabel} — ${jobName}`);
  const body = encodeURIComponent(buildFormSummaryText(form, jobName));
  return `mailto:?subject=${subject}&body=${body}`;
}

function JobFormsTab({ jobId, jobName }: { jobId: number; jobName: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "fill">("list");
  const [activeFormId, setActiveFormId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [signerName, setSignerName] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [empSigInput, setEmpSigInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: forms = [], isLoading } = useListJobForms(jobId, { query: { refetchInterval: 30000 } });

  const activeForm = (forms as JobFormRecord[]).find((f) => f.id === activeFormId);

  const { mutate: createForm, isPending: isCreating } = useCreateJobForm({
    mutation: {
      onSuccess: (form: any) => {
        qc.invalidateQueries({ queryKey: getListJobFormsQueryKey(jobId) });
        setActiveFormId(form.id);
        setFormValues({});
        setSignerName("");
        setView("fill");
      },
    },
  });

  const { mutate: submitForm, isPending: isSubmitting } = useSubmitJobForm({
    mutation: {
      onSuccess: (_data, variables) => {
        qc.invalidateQueries({ queryKey: getListJobFormsQueryKey(jobId) });
        if ((variables as any)?.data?.signatureName) {
          setView("list");
          toast({ title: "Form signed and submitted" });
        }
      },
    },
  });

  const { mutate: deleteForm } = useDeleteJobForm({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListJobFormsQueryKey(jobId) });
        setDeleteId(null);
      },
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large (max 20 MB)", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      createForm({
        id: jobId,
        data: { formType: "custom", customFormName: file.name, customFormData: dataUrl },
      });
      setIsUploading(false);
    };
    reader.onerror = () => {
      toast({ title: "Failed to read file", variant: "destructive" });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [createForm, jobId, toast]);

  const saveFieldsOnly = (vals: Record<string, string>) => {
    if (!activeFormId) return;
    submitForm({ id: jobId, formId: activeFormId, data: { fields: vals } });
  };

  const handleSubmit = () => {
    if (!signerName.trim()) {
      toast({ title: "Please enter the signer's name", variant: "destructive" });
      return;
    }
    if (!activeFormId) return;
    submitForm({
      id: jobId,
      formId: activeFormId,
      data: { fields: formValues, signatureName: signerName.trim(), signatureData: "typed" },
    });
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading forms…</div>;

  if (view === "fill" && activeForm) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("list")} className="gap-1">
            <ChevronRight className="h-4 w-4 rotate-180" /> Back
          </Button>
          <h3 className="font-semibold text-base">
            {activeForm.formType === "job_completion" ? "Job Completion Form"
              : activeForm.formType === "quality_control" ? "Quality Control Checklist"
              : activeForm.formType === "safe_work_permit" ? "Safe Work Permit"
              : activeForm.customFormName ?? "Uploaded Form"}
          </h3>
        </div>

        {activeForm.formType === "custom" && activeForm.customFormData ? (
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {activeForm.customFormName}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activeForm.customFormData.startsWith("data:application/pdf") ? (
                <iframe
                  src={activeForm.customFormData}
                  className="w-full rounded-b-lg"
                  style={{ height: "70vh", border: "none" }}
                  title={activeForm.customFormName ?? "Form"}
                />
              ) : (
                <img
                  src={activeForm.customFormData}
                  alt={activeForm.customFormName ?? "Form"}
                  className="w-full rounded-b-lg object-contain max-h-[70vh]"
                />
              )}
            </CardContent>
          </Card>
        ) : activeForm.formType === "quality_control" ? (
          <div className="space-y-6">
            {/* Checklist */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-primary" /> Photo &amp; Documentation Checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {QC_CHECKLIST_ITEMS.map((item) => {
                  const checked = formValues[item.key] === "true";
                  return (
                    <button
                      key={item.key}
                      onClick={() => setFormValues((prev) => ({ ...prev, [item.key]: checked ? "false" : "true" }))}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${checked ? "bg-green-50 border-green-300" : "border-border hover:bg-muted"}`}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? "bg-green-600 border-green-600" : "border-muted-foreground/40"}`}>
                        {checked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <span className={`text-sm font-medium ${checked ? "text-green-800" : "text-foreground"}`}>{item.label}</span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
            {/* Splice Information */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold">Splice Information</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-6">
                {QC_SPLICE_SECTIONS.map((section) => (
                  <div key={section.title}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{section.title}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {section.fields.map((field) => (
                        <div key={field.key} className={`space-y-1.5 ${field.options && field.options.length === 3 ? "col-span-2" : ""}`}>
                          <label className="text-xs font-medium text-foreground">{field.label}</label>
                          {field.type === "yesno" ? (
                            <div className="flex gap-2">
                              {["yes", "no"].map((v) => (
                                <button key={v}
                                  onClick={() => setFormValues((prev) => ({ ...prev, [field.key]: v }))}
                                  className={`px-4 py-1.5 rounded-md border text-xs font-medium transition-colors ${formValues[field.key] === v ? (v === "yes" ? "bg-green-600 border-green-600 text-white" : "bg-red-500 border-red-500 text-white") : "border-border text-muted-foreground hover:bg-muted"}`}
                                >{v === "yes" ? "✓ Yes" : "✗ No"}</button>
                              ))}
                            </div>
                          ) : field.type === "select" ? (
                            <div className="flex flex-wrap gap-1.5">
                              {(field.options ?? []).map((opt) => (
                                <button key={opt}
                                  onClick={() => setFormValues((prev) => ({ ...prev, [field.key]: opt }))}
                                  className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${formValues[field.key] === opt ? "bg-primary border-primary text-white" : "border-border text-muted-foreground hover:bg-muted"}`}
                                >{opt}</button>
                              ))}
                            </div>
                          ) : (
                            <input
                              type={field.type === "date" ? "date" : "text"}
                              className="w-full px-3 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                              placeholder={field.type !== "date" ? "Enter value…" : undefined}
                              value={formValues[field.key] ?? ""}
                              onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Temperature & Pressure Log */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold">Temperature &amp; Pressure Log</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Record readings every 5 minutes</p>
              </CardHeader>
              <CardContent className="p-4 pb-0 border-b flex gap-6">
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={formValues["tl_start_time"] ?? ""}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, tl_start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-medium text-muted-foreground">End Time</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={formValues["tl_end_time"] ?? ""}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, tl_end_time: e.target.value }))}
                  />
                </div>
              </CardContent>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className="px-3 py-2 text-left font-semibold border-b border-r border-border sticky left-0 bg-muted/80 min-w-[52px]">Min</th>
                        {TIME_LOG_COLS.map((col, i) => (
                          <th key={col.key + i} className="px-2 py-2 text-center font-semibold border-b border-r border-border min-w-[90px] whitespace-pre-wrap leading-tight">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TIME_INTERVALS.map((min, ri) => (
                        <tr key={min} className={ri % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <td className="px-3 py-1.5 font-medium border-r border-border sticky left-0 bg-inherit text-muted-foreground">{min}</td>
                          {TIME_LOG_COLS.map((col, ci) => (
                            <td key={col.key + ci} className="border-r border-border p-0.5">
                              <input
                                className="w-full px-2 py-1 text-xs text-center bg-transparent focus:outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/30 rounded"
                                placeholder="—"
                                value={formValues[`tl_${min}_${col.key}`] ?? ""}
                                onChange={(e) => setFormValues((prev) => ({ ...prev, [`tl_${min}_${col.key}`]: e.target.value }))}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : activeForm.formType === "safe_work_permit" ? (
          <div className="space-y-6">
            {/* General Information */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> General Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  {SWP_GENERAL_FIELDS.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{f.label}</label>
                      <input
                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder={f.label}
                        value={formValues[f.key] ?? ""}
                        onChange={(e) => setFormValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hazard Identification */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-primary" /> Hazard Identification
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm font-medium">Are you lifting today?</span>
                  {["yes", "no"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setFormValues((prev) => ({ ...prev, swp_are_lifting: v }))}
                      className={`px-4 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                        formValues["swp_are_lifting"] === v
                          ? v === "yes" ? "bg-green-600 border-green-600 text-white" : "bg-red-500 border-red-500 text-white"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >{v === "yes" ? "✓ Yes" : "✗ No"}</button>
                  ))}
                  {formValues["swp_are_lifting"] === "yes" && (
                    <input
                      className="ml-2 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Weight of item (lbs)"
                      value={formValues["swp_lift_weight"] ?? ""}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, swp_lift_weight: e.target.value }))}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Check all hazards that apply:</p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                  {SWP_HAZARD_ITEMS.map((item) => {
                    const checked = formValues[item.key] === "true";
                    return (
                      <label key={item.key} className="flex items-center gap-2 cursor-pointer text-sm">
                        <div
                          onClick={() => setFormValues((prev) => ({ ...prev, [item.key]: checked ? "false" : "true" }))}
                          className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            checked ? "bg-primary border-primary text-white" : "border-border hover:border-primary/50"
                          }`}
                        >
                          {checked && <span className="text-xs font-bold">✓</span>}
                        </div>
                        <span className={checked ? "font-medium" : "text-muted-foreground"}>{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Additional Permits */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-primary" /> Additional Permits &amp; Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {SWP_PERMIT_FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center justify-between gap-4">
                    <span className="text-sm">{f.label}</span>
                    <div className="flex gap-2 flex-shrink-0">
                      {["yes", "no"].map((v) => (
                        <button
                          key={v}
                          onClick={() => setFormValues((prev) => ({ ...prev, [f.key]: v }))}
                          className={`px-4 py-1 rounded-md border text-sm font-medium transition-colors ${
                            formValues[f.key] === v
                              ? v === "yes" ? "bg-green-600 border-green-600 text-white" : "bg-red-500 border-red-500 text-white"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >{v === "yes" ? "Yes" : "No"}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Hazard Analysis Table */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-primary" /> Work Area Hazard Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/60">
                      <th className="px-3 py-2 text-left border-b border-r border-border w-1/3">Work Area</th>
                      <th className="px-3 py-2 text-left border-b border-r border-border w-1/3">Hazards Identified</th>
                      <th className="px-3 py-2 text-left border-b border-border w-1/3">Mitigation / Controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: SWP_HA_ROWS }).map((_, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        {["ha_area", "ha_hazards", "ha_mitigation"].map((col) => (
                          <td key={col} className="border-r last:border-r-0 border-border p-0.5">
                            <input
                              className="w-full px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/30 rounded"
                              placeholder="—"
                              value={formValues[`${col}_${i}`] ?? ""}
                              onChange={(e) => setFormValues((prev) => ({ ...prev, [`${col}_${i}`]: e.target.value }))}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Employee Acknowledgment */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-primary" /> Employee Acknowledgment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <p className="text-xs text-muted-foreground">Each crew member must sign below to acknowledge they have been briefed on the hazards and controls.</p>
                {(() => {
                  const sigs: { name: string; date: string }[] = (() => {
                    try { return JSON.parse(formValues["employee_sigs"] ?? "[]"); } catch { return []; }
                  })();
                  return (
                    <div className="space-y-3">
                      {sigs.length > 0 && (
                        <div className="divide-y divide-border border border-border rounded-md overflow-hidden">
                          {sigs.map((s, idx) => (
                            <div key={idx} className="flex items-center justify-between px-4 py-2.5 bg-green-50/50">
                              <span className="text-sm font-medium" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>{s.name}</span>
                              <span className="text-xs text-muted-foreground">{s.date}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder="Your full name to acknowledge…"
                          value={empSigInput}
                          onChange={(e) => setEmpSigInput(e.target.value)}
                        />
                        <Button
                          size="sm"
                          disabled={!empSigInput.trim()}
                          onClick={() => {
                            const existing: { name: string; date: string }[] = (() => {
                              try { return JSON.parse(formValues["employee_sigs"] ?? "[]"); } catch { return []; }
                            })();
                            const updated = [...existing, { name: empSigInput.trim(), date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }];
                            const newVals = { ...formValues, employee_sigs: JSON.stringify(updated) };
                            setFormValues(newVals);
                            saveFieldsOnly(newVals);
                            setEmpSigInput("");
                          }}
                          className="gap-1.5 flex-shrink-0"
                        >
                          <PenLine className="h-3.5 w-3.5" /> Sign
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-5">
              {JOB_COMPLETION_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">{field.label}</label>
                  {field.type === "yesno" ? (
                    <div className="flex gap-2">
                      {["yes", "no"].map((v) => (
                        <button
                          key={v}
                          onClick={() => setFormValues((prev) => ({ ...prev, [field.key]: v }))}
                          className={`px-5 py-2 rounded-md border text-sm font-medium transition-colors ${
                            formValues[field.key] === v
                              ? v === "yes" ? "bg-green-600 border-green-600 text-white" : "bg-red-500 border-red-500 text-white"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {v === "yes" ? "✓ Yes" : "✗ No"}
                        </button>
                      ))}
                    </div>
                  ) : field.type === "textarea" ? (
                    <textarea
                      className="w-full min-h-[80px] px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Enter details…"
                      value={formValues[field.key] ?? ""}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  ) : (
                    <input
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Enter value…"
                      value={formValues[field.key] ?? ""}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Electronic Signature */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary" />
              Electronic Signature
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              By entering your full name below, you confirm that the information above is accurate and complete. This serves as your electronic signature.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full name (legal signature)</label>
              <input
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Type your full name to sign…"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>
            {signerName && (
              <div className="border border-border rounded-md p-4 bg-muted/20 text-center">
                <p className="text-2xl" style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#1a1a1a" }}>
                  {signerName}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Signed electronically · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}
            <Button className="w-full gap-2" onClick={handleSubmit} disabled={isSubmitting || !signerName.trim()}>
              <PenLine className="h-4 w-4" />
              {isSubmitting ? "Submitting…" : "Sign & Submit Form"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {(forms as JobFormRecord[]).length === 0 ? "No forms yet" : `${(forms as JobFormRecord[]).length} form${(forms as JobFormRecord[]).length !== 1 ? "s" : ""}`}
        </p>
        <div className="flex gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={isCreating || isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            {isUploading ? "Uploading…" : "Upload Form"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isCreating || isUploading}
            onClick={() => createForm({ id: jobId, data: { formType: "quality_control" } })}
            className="gap-1.5"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            QC Checklist
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isCreating || isUploading}
            onClick={() => createForm({ id: jobId, data: { formType: "safe_work_permit" } })}
            className="gap-1.5"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Safe Work Permit
          </Button>
          <Button
            size="sm"
            disabled={isCreating || isUploading}
            onClick={() => createForm({ id: jobId, data: { formType: "job_completion" } })}
            className="gap-1.5"
          >
            <PenLine className="h-3.5 w-3.5" />
            Job Completion
          </Button>
        </div>
      </div>

      {(forms as JobFormRecord[]).length === 0 ? (
        <Card className="p-12 text-center">
          <PenLine className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">No forms yet</p>
          <p className="text-sm text-muted-foreground">Upload your own form, or start a Job Completion, QC Checklist, or Safe Work Permit above.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(forms as JobFormRecord[]).map((form) => {
            const isSigned = form.status === "signed";
            const parsed = form.fields ? JSON.parse(form.fields) as Record<string, string> : {};
            const fieldDefs = form.formType === "quality_control" ? QC_FIELDS : JOB_COMPLETION_FIELDS;
            const isExpanded = expandedId === form.id;

            return (
              <Card key={form.id} className={isSigned ? "border-green-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${isSigned ? "bg-green-50" : "bg-amber-50"}`}>
                        {isSigned
                          ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                          : <Circle className="h-4 w-4 text-amber-500" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {form.formType === "job_completion" ? "Job Completion Form"
                            : form.formType === "quality_control" ? "Quality Control Checklist"
                            : form.formType === "safe_work_permit" ? "Safe Work Permit"
                            : form.customFormName ?? "Uploaded Form"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isSigned
                            ? `Signed by ${form.signatureName} · ${format(new Date(form.signedAt!), "MMM d, yyyy h:mm a")}`
                            : `Created ${format(new Date(form.createdAt), "MMM d, yyyy")}`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={isSigned ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-600 border-amber-200"}>
                        {isSigned ? "Signed" : "Draft"}
                      </Badge>
                      {!isSigned && (
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => { setActiveFormId(form.id); setFormValues(parsed); setView("fill"); }}>
                          <PenLine className="h-3 w-3" /> {form.formType === "custom" ? "Sign" : "Fill"}
                        </Button>
                      )}
                      {isSigned && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setExpandedId(isExpanded ? null : form.id)}>
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            View
                          </Button>
                          <a
                            href={buildEmailLink(form, jobName)}
                            title="Send via email"
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            title="Copy form summary"
                            onClick={() => {
                              navigator.clipboard.writeText(buildFormSummaryText(form, jobName));
                              toast({ title: "Copied to clipboard" });
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(form.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && isSigned && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {form.formType === "custom" ? (
                        <>
                          {form.customFormData && (
                            form.customFormData.startsWith("data:application/pdf") ? (
                              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/30 text-sm">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">{form.customFormName}</span>
                                <a href={form.customFormData} download={form.customFormName} className="ml-auto text-primary text-xs font-medium hover:underline">Download</a>
                              </div>
                            ) : (
                              <img src={form.customFormData} alt={form.customFormName ?? "Form"} className="w-full max-h-48 object-contain rounded-md border" />
                            )
                          )}
                        </>
                      ) : (
                        fieldDefs.map((fd) => (
                          <div key={fd.key} className="flex items-start justify-between gap-4 text-sm">
                            <span className="text-muted-foreground shrink-0 w-64">{fd.label}</span>
                            <span className={`font-medium text-right ${parsed[fd.key] === "yes" ? "text-green-600" : parsed[fd.key] === "no" ? "text-red-500" : ""}`}>
                              {parsed[fd.key] === "yes" ? "✓ Yes" : parsed[fd.key] === "no" ? "✗ No" : parsed[fd.key] || "—"}
                            </span>
                          </div>
                        ))
                      )}
                      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
                        <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Signed by:</span>
                        <span className="font-medium" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>{form.signatureName}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this form and its signature. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteId && deleteForm({ id: jobId, formId: deleteId })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}