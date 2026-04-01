import { useState, useRef } from "react";
import { useParams, Link, useLocation as useWouterLocation } from "wouter";
import { 
  useGetCrewMember, getGetCrewMemberQueryKey,
  useUpdateCrewMember,
  useDeleteCrewMember, getListCrewQueryKey,
  useListJobs,
  useListCrewDocuments, getListCrewDocumentsQueryKey,
  useUploadCrewDocument,
  useDeleteCrewDocument,
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { 
  Phone, Mail, Trash2, Edit, Briefcase, MapPin, ChevronLeft,
  FileText, Upload, Download, ShieldCheck, BookOpen, Award, AlertTriangle, Plus, File
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { value: "certificate", label: "Certificate", icon: Award },
  { value: "license", label: "License", icon: ShieldCheck },
  { value: "training", label: "Training Record", icon: BookOpen },
  { value: "safety", label: "Safety Card", icon: AlertTriangle },
  { value: "other", label: "Other", icon: File },
];

const docTypeConfig = Object.fromEntries(DOC_TYPES.map((t) => [t.value, t]));

const STATUS_COLORS = {
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

// ─── Expiry helpers ────────────────────────────────────────────────────────

function getExpiryStatus(expiryDate: Date | string | null | undefined) {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  const now = new Date();
  const diffDays = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Expired", className: "bg-red-100 text-red-800", urgent: true };
  if (diffDays <= 30) return { label: `Expires in ${diffDays}d`, className: "bg-amber-100 text-amber-800", urgent: true };
  if (diffDays <= 90) return { label: `Expires in ${Math.round(diffDays / 7)}wk`, className: "bg-yellow-100 text-yellow-800", urgent: false };
  return { label: `Valid · ${formatDate(expiryDate)}`, className: "bg-green-100 text-green-800", urgent: false };
}

// ─── Upload Dialog ─────────────────────────────────────────────────────────

const uploadSchema = z.object({
  title: z.string().min(2, "Title is required"),
  docType: z.string().min(1, "Type is required"),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

function UploadDocumentDialog({ crewId }: { crewId: number }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [fileError, setFileError] = useState("");
  const [isReading, setIsReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { title: "", docType: "certificate", expiryDate: "", notes: "" },
  });

  const { mutate: upload, isPending } = useUploadCrewDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCrewDocumentsQueryKey(crewId) });
        toast({ title: "Document uploaded" });
        setOpen(false);
        setFile(null);
        form.reset({ title: "", docType: "certificate", expiryDate: "", notes: "" });
      },
      onError: () => toast({ title: "Upload failed", variant: "destructive" }),
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (picked.size > 15 * 1024 * 1024) {
      setFileError("File must be under 15 MB");
      return;
    }
    setFileError("");
    setIsReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setFile({ name: picked.name, mimeType: picked.type, data: reader.result as string });
      if (!form.getValues("title")) form.setValue("title", picked.name.replace(/\.[^.]+$/, ""));
      setIsReading(false);
    };
    reader.readAsDataURL(picked);
  };

  const handleSubmit = (values: UploadFormValues) => {
    if (!file) { setFileError("Please select a file"); return; }
    upload({
      crewId,
      data: {
        title: values.title,
        docType: values.docType,
        fileName: file.name,
        fileMimeType: file.mimeType,
        fileData: file.data,
        expiryDate: values.expiryDate ? new Date(values.expiryDate).toISOString() : undefined,
        notes: values.notes || undefined,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setFile(null); setFileError(""); form.reset(); } }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Document</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>Add a training record, certificate, or license to this profile.</DialogDescription>
        </DialogHeader>

        {/* File picker */}
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileChange} />
          {file ? (
            <div className="flex items-center gap-2 justify-center text-sm">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium truncate max-w-[200px]">{file.name}</span>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Click to select a file</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOC — max 15 MB</p>
            </>
          )}
          {isReading && <p className="text-xs text-primary mt-2">Reading file…</p>}
        </div>
        {fileError && <p className="text-xs text-destructive -mt-2">{fileError}</p>}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title *</FormLabel><FormControl><Input placeholder="OSHA 10 Certificate" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="docType" render={({ field }) => (
              <FormItem>
                <FormLabel>Document Type *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="expiryDate" render={({ field }) => (
              <FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Issuing body, cert number, etc." rows={2} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending || isReading}>{isPending ? "Uploading…" : "Upload"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Documents Tab ─────────────────────────────────────────────────────────

function DocumentsTab({ crewId }: { crewId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: docs, isLoading } = useListCrewDocuments(crewId, {
    query: { queryKey: getListCrewDocumentsQueryKey(crewId) },
  });

  const { mutate: deleteDoc } = useDeleteCrewDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCrewDocumentsQueryKey(crewId) });
        toast({ title: "Document removed" });
      },
      onError: () => toast({ title: "Failed to remove document", variant: "destructive" }),
    },
  });

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="border-b border-border bg-muted/20 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Documents &amp; Certifications
          {docs && docs.length > 0 && <Badge variant="secondary" className="ml-1">{docs.length}</Badge>}
        </CardTitle>
        <UploadDocumentDialog crewId={crewId} />
      </CardHeader>
      <CardContent className="p-0">
        {!docs || docs.length === 0 ? (
          <div className="py-14 text-center text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No documents on file</p>
            <p className="text-sm mt-1">Upload training records, certificates, and licenses.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {docs.map((doc) => {
              const typeCfg = docTypeConfig[doc.docType] ?? docTypeConfig.other;
              const expiry = getExpiryStatus(doc.expiryDate);
              const downloadUrl = `/api/crew-documents/${doc.id}/download`;
              return (
                <div key={doc.id} className="flex items-start justify-between gap-3 p-4 hover:bg-muted/20 group">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="bg-primary/10 p-2 rounded-md shrink-0">
                      <typeCfg.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{doc.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{typeCfg.label}</Badge>
                        {expiry && (
                          <Badge className={`text-xs ${expiry.className}`}>
                            {expiry.urgent && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {expiry.label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{doc.fileName} · Uploaded {formatDate(doc.createdAt)}</p>
                      {doc.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{doc.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Download">
                      <a href={downloadUrl} download={doc.fileName}><Download className="h-4 w-4" /></a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Delete"
                      onClick={() => { if (confirm(`Delete "${doc.title}"?`)) deleteDoc({ id: doc.id }); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function CrewDetail() {
  const { id } = useParams();
  const memberId = parseInt(id || "0", 10);
  
  const { data: member, isLoading, error } = useGetCrewMember(memberId, { 
    query: { enabled: !!memberId, queryKey: getGetCrewMemberQueryKey(memberId) } 
  });
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
        <Button asChild className="mt-6"><Link href="/crew">Back to Crew</Link></Button>
      </div>
    );
  }

  const memberJobs = allJobs?.filter((j) => j.status === "in_progress" || j.status === "scheduled") ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 text-muted-foreground hover:text-foreground">
          <Link href="/crew"><ChevronLeft className="h-4 w-4 mr-1" /> Back to Crew</Link>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Profile Card ── */}
        <Card className="w-full lg:w-1/3 border-border shadow-sm overflow-hidden shrink-0">
          <div className="h-32 bg-primary/10 relative" />
          <CardContent className="px-6 pb-6 pt-0 relative -mt-16 flex flex-col items-center text-center">
            <Avatar className="h-32 w-32 border-4 border-card shadow-sm bg-secondary text-secondary-foreground mb-4">
              <AvatarImage src={member.avatarUrl || ""} />
              <AvatarFallback className="text-4xl font-bold">
                {member.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold tracking-tight">{member.name}</h1>
            <Badge variant="secondary" className="mt-2 mb-6 bg-primary text-primary-foreground hover:bg-primary font-bold uppercase tracking-wider">
              {member.role}
            </Badge>
            <div className="w-full space-y-4 text-left border-t border-border pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-full"><Phone className="h-4 w-4 text-muted-foreground" /></div>
                <div><p className="text-sm font-medium">Phone</p><p className="text-sm text-muted-foreground">{member.phone || "Not provided"}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-full"><Mail className="h-4 w-4 text-muted-foreground" /></div>
                <div><p className="text-sm font-medium">Email</p><p className="text-sm text-muted-foreground">{member.email || "Not provided"}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-full"><Briefcase className="h-4 w-4 text-muted-foreground" /></div>
                <div><p className="text-sm font-medium">Joined</p><p className="text-sm text-muted-foreground">{formatDate(member.createdAt)}</p></div>
              </div>
            </div>
            <div className="w-full border-t border-border pt-6 mt-6 flex justify-center gap-3">
              <UpdateCrewDialog member={member} />
              <DeleteCrewDialog memberId={member.id} memberName={member.name} />
            </div>
          </CardContent>
        </Card>

        {/* ── Tabs: Assignments + Documents ── */}
        <div className="w-full lg:w-2/3">
          <Tabs defaultValue="assignments" className="w-full">
            <TabsList className="grid grid-cols-2 w-full max-w-xs h-auto p-1 bg-muted/50 mb-6">
              <TabsTrigger value="assignments" className="py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Briefcase className="h-4 w-4 mr-1.5" /> Assignments
              </TabsTrigger>
              <TabsTrigger value="documents" className="py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <FileText className="h-4 w-4 mr-1.5" /> Documents
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assignments" className="outline-none focus-visible:ring-0">
              <Card className="border-border shadow-sm">
                <CardHeader className="border-b border-border bg-muted/20">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" /> Active Assignments
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
                      {memberJobs.slice(0, 5).map((job) => (
                        <Link key={job.id} href={`/jobs/${job.id}`} className="block p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold">{job.title}</h4>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                                <span>Starts: {formatDate(job.startDate)}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className={`uppercase text-[10px] font-bold shrink-0 ${STATUS_COLORS[job.status as keyof typeof STATUS_COLORS] ?? ""}`}>
                              {job.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="outline-none focus-visible:ring-0">
              <DocumentsTab crewId={memberId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// ─── Update Crew Dialog ────────────────────────────────────────────────────

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
    defaultValues: { name: member.name, role: member.role, phone: member.phone || "", email: member.email || "" },
  });

  const onSubmit = (values: z.infer<typeof updateCrewSchema>) => {
    updateCrew.mutate({ id: member.id, data: { ...values, phone: values.phone || undefined, email: values.email || undefined } }, {
      onSuccess: () => {
        toast({ title: "Profile Updated", description: "Changes have been saved." });
        queryClient.invalidateQueries({ queryKey: getGetCrewMemberQueryKey(member.id) });
        queryClient.invalidateQueries({ queryKey: getListCrewQueryKey() });
        setOpen(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-semibold flex-1"><Edit className="h-4 w-4 mr-2" /> Edit Profile</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
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

// ─── Delete Crew Dialog ────────────────────────────────────────────────────

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
        window.location.href = "/crew";
      },
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
