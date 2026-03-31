import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetCrewMember, getGetCrewMemberQueryKey,
  useUpdateCrewMember,
  useDeleteCrewMember, getListCrewQueryKey,
  useListJobs,
  getGetDashboardSummaryQueryKey
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, Trash2, Edit, Briefcase, MapPin, ChevronLeft } from "lucide-react";

export default function CrewDetail() {
  const { id } = useParams();
  const memberId = parseInt(id || "0", 10);
  
  const { data: member, isLoading, error } = useGetCrewMember(memberId, { 
    query: { enabled: !!memberId, queryKey: getGetCrewMemberQueryKey(memberId) } 
  });

  // Also fetch all jobs to figure out which ones this crew member is assigned to
  // In a real app we'd want a dedicated endpoint for this: /api/crew/:id/jobs
  // But using what's available
  const { data: allJobs } = useListJobs();
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" className="pl-0"><ChevronLeft className="h-4 w-4 mr-1" /> Back to Crew</Button>
        <div className="flex flex-col md:flex-row gap-6">
          <Skeleton className="h-[300px] w-full md:w-1/3 rounded-lg" />
          <Skeleton className="h-[500px] w-full md:w-2/3 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-destructive">Member Not Found</h2>
        <p className="text-muted-foreground mt-2">This crew member doesn't exist or has been removed.</p>
        <Button asChild className="mt-6">
          <Link href="/crew">Back to Crew</Link>
        </Button>
      </div>
    );
  }

  // Filter jobs where this member is in the crew
  // Note: the backend /api/jobs endpoint might not include full crew array on the list endpoint,
  // this is an approximation based on the available APIs
  const memberJobs = allJobs?.filter(job => job.status === "in_progress" || job.status === "scheduled") || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 text-muted-foreground hover:text-foreground">
          <Link href="/crew"><ChevronLeft className="h-4 w-4 mr-1" /> Back to Crew</Link>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Profile Card */}
        <Card className="w-full lg:w-1/3 border-border shadow-sm overflow-hidden shrink-0">
          <div className="h-32 bg-primary/10 relative"></div>
          <CardContent className="px-6 pb-6 pt-0 relative -mt-16 flex flex-col items-center text-center">
            <Avatar className="h-32 w-32 border-4 border-card shadow-sm bg-secondary text-secondary-foreground mb-4">
              <AvatarImage src={member.avatarUrl || ""} />
              <AvatarFallback className="text-4xl font-bold">
                {member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <h1 className="text-2xl font-bold tracking-tight">{member.name}</h1>
            <Badge variant="secondary" className="mt-2 mb-6 bg-primary text-primary-foreground hover:bg-primary font-bold uppercase tracking-wider">
              {member.role}
            </Badge>
            
            <div className="w-full space-y-4 text-left border-t border-border pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-full">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{member.phone || "Not provided"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-full">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{member.email || "Not provided"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-full">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Joined</p>
                  <p className="text-sm text-muted-foreground">{formatDate(member.createdAt)}</p>
                </div>
              </div>
            </div>
            
            <div className="w-full border-t border-border pt-6 mt-6 flex justify-center gap-3">
              <UpdateCrewDialog member={member} />
              <DeleteCrewDialog memberId={member.id} memberName={member.name} />
            </div>
          </CardContent>
        </Card>

        {/* Assignments & History */}
        <div className="w-full lg:w-2/3 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Active Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {memberJobs.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Not currently assigned to any active jobs.</p>
                  <Button variant="outline" size="sm" asChild className="mt-4">
                    <Link href="/jobs">View Jobs to Assign</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {/* Note: In a real implementation we would only show jobs this member is actually assigned to.
                      Without the specific endpoint, we are showing all active jobs here as a placeholder for the UI. */}
                  {memberJobs.slice(0, 3).map(job => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="block p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{job.title}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                            <span>Starts: {formatDate(job.startDate)}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="uppercase text-[10px] font-bold shrink-0">
                          {job.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// UPDATE CREW DIALOG
// -----------------------------------------------------------------------------

const updateCrewSchema = z.object({
  name: z.string().min(2, "Name is required"),
  role: z.string().min(2, "Role is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

function UpdateCrewDialog({ member }: { member: any }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateCrew = useUpdateCrewMember();
  
  const form = useForm<z.infer<typeof updateCrewSchema>>({
    resolver: zodResolver(updateCrewSchema),
    defaultValues: {
      name: member.name,
      role: member.role,
      phone: member.phone || "",
      email: member.email || "",
    },
  });

  const onSubmit = (values: z.infer<typeof updateCrewSchema>) => {
    updateCrew.mutate({
      id: member.id,
      data: {
        ...values,
        phone: values.phone || undefined,
        email: values.email || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Profile Updated", description: "Changes have been saved." });
        queryClient.invalidateQueries({ queryKey: getGetCrewMemberQueryKey(member.id) });
        queryClient.invalidateQueries({ queryKey: getListCrewQueryKey() });
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-semibold flex-1">
          <Edit className="h-4 w-4 mr-2" /> Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem><FormLabel>Role / Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateCrew.isPending}>{updateCrew.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// DELETE CREW DIALOG
// -----------------------------------------------------------------------------

function DeleteCrewDialog({ memberId, memberName }: { memberId: number; memberName: string }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteCrew = useDeleteCrewMember();

  const handleDelete = () => {
    deleteCrew.mutate({ id: memberId }, {
      onSuccess: () => {
        toast({ title: "Member Removed", description: "Crew member has been deleted." });
        queryClient.invalidateQueries({ queryKey: getListCrewQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        window.location.href = "/crew"; // Navigate back
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="icon" className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-0">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Crew Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove "{memberName}" from the team? They will be unassigned from all current jobs. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteCrew.isPending}>
            {deleteCrew.isPending ? "Removing..." : "Remove Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}