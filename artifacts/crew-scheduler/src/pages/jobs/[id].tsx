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
  PenLine, ClipboardCheck, CheckCircle2, Circle, ChevronDown, ChevronRight
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
            <JobFormsTab jobId={jobId} />
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

const QC_FIELDS = [
  { key: "inspector_name", label: "Inspector name", type: "text" },
  { key: "meets_specifications", label: "Work meets project specifications?", type: "yesno" },
  { key: "safety_protocols", label: "All safety protocols followed?", type: "yesno" },
  { key: "site_cleanliness", label: "Site cleanliness acceptable?", type: "yesno" },
  { key: "deficiencies", label: "Deficiencies noted (leave blank if none)", type: "textarea" },
  { key: "deficiencies_addressed", label: "All deficiencies have been addressed?", type: "yesno" },
  { key: "photos_taken", label: "Photos taken of completed work?", type: "yesno" },
] as const;

type FormType = "job_completion" | "quality_control";
type JobFormRecord = {
  id: number; jobId: number; formType: FormType; status: "draft" | "signed";
  fields?: string | null; signatureName?: string | null; signatureData?: string | null;
  signedByCrewId?: number | null; signedAt?: string | null; createdAt: string;
  signedByCrew?: { id: number; name: string } | null;
};

function JobFormsTab({ jobId }: { jobId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "fill">("list");
  const [activeFormId, setActiveFormId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [signerName, setSignerName] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: forms = [], isLoading } = useListJobForms(jobId);

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
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListJobFormsQueryKey(jobId) });
        setView("list");
        toast({ title: "Form signed and submitted" });
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

  const activeForm = (forms as JobFormRecord[]).find((f) => f.id === activeFormId);
  const fields = activeForm?.formType === "quality_control" ? QC_FIELDS : JOB_COMPLETION_FIELDS;

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
            {activeForm.formType === "job_completion" ? "Job Completion Form" : "Quality Control Checklist"}
          </h3>
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">
            {fields.map((field) => (
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isCreating}
            onClick={() => createForm({ id: jobId, data: { formType: "quality_control" } })}
            className="gap-1.5"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            QC Checklist
          </Button>
          <Button
            size="sm"
            disabled={isCreating}
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
          <p className="text-sm text-muted-foreground">Create a Job Completion or Quality Control form above.</p>
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
                          {form.formType === "job_completion" ? "Job Completion Form" : "Quality Control Checklist"}
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
                          <PenLine className="h-3 w-3" /> Fill
                        </Button>
                      )}
                      {isSigned && (
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setExpandedId(isExpanded ? null : form.id)}>
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          View
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(form.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && isSigned && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {fieldDefs.map((fd) => (
                        <div key={fd.key} className="flex items-start justify-between gap-4 text-sm">
                          <span className="text-muted-foreground shrink-0 w-64">{fd.label}</span>
                          <span className={`font-medium text-right ${parsed[fd.key] === "yes" ? "text-green-600" : parsed[fd.key] === "no" ? "text-red-500" : ""}`}>
                            {parsed[fd.key] === "yes" ? "✓ Yes" : parsed[fd.key] === "no" ? "✗ No" : parsed[fd.key] || "—"}
                          </span>
                        </div>
                      ))}
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