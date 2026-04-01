import { useState } from "react";
import { useParams, Link, useLocation as useWouterLocation } from "wouter";
import {
  useGetLocation,
  useUpdateLocation,
  useDeleteLocation,
  getGetLocationQueryKey,
  getListLocationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  Phone,
  Mail,
  Lock,
  Briefcase,
  Pencil,
  Trash2,
  ArrowLeft,
  User,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const editLocationSchema = z.object({
  name: z.string().min(2, "Name is required"),
  address: z.string().min(2, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  accessNotes: z.string().optional(),
  notes: z.string().optional(),
});

type EditLocationFormValues = z.infer<typeof editLocationSchema>;

export default function LocationDetail() {
  const { id } = useParams();
  const locationId = parseInt(id || "0", 10);
  const [, navigate] = useWouterLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: location, isLoading, error } = useGetLocation(locationId, {
    query: { enabled: !!locationId, queryKey: getGetLocationQueryKey(locationId) },
  });

  const { mutate: updateLocation, isPending: isUpdating } = useUpdateLocation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLocationQueryKey(locationId) });
        queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        toast({ title: "Location updated" });
        setIsEditOpen(false);
      },
      onError: () => toast({ title: "Failed to update location", variant: "destructive" }),
    },
  });

  const { mutate: deleteLocation } = useDeleteLocation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        toast({ title: "Location deleted" });
        navigate("/locations");
      },
      onError: () => toast({ title: "Failed to delete location", variant: "destructive" }),
    },
  });

  const form = useForm<EditLocationFormValues>({
    resolver: zodResolver(editLocationSchema),
    values: location
      ? {
          name: location.name,
          address: location.address,
          city: location.city,
          state: location.state,
          zip: location.zip ?? "",
          contactName: location.contactName ?? "",
          contactPhone: location.contactPhone ?? "",
          contactEmail: location.contactEmail ?? "",
          accessNotes: location.accessNotes ?? "",
          notes: location.notes ?? "",
        }
      : undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-5 w-1/4" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-destructive">Location Not Found</h2>
        <p className="text-muted-foreground mt-2">This location doesn't exist or has been removed.</p>
        <Button asChild className="mt-6">
          <Link href="/locations">Back to Locations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/locations" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="h-4 w-4" /> Locations
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{location.name}</h1>
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{location.address}, {location.city}, {location.state}{location.zip ? ` ${location.zip}` : ""}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit Location
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 text-destructive hover:bg-destructive/10"
              onClick={() => { if (confirm("Delete this location? Jobs linked to it will be unlinked.")) deleteLocation({ id: locationId }); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Site Contact */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" /> Site Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {location.contactName ? (
              <>
                <p className="font-medium">{location.contactName}</p>
                {location.contactPhone && (
                  <a href={`tel:${location.contactPhone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                    <Phone className="h-4 w-4" /> {location.contactPhone}
                  </a>
                )}
                {location.contactEmail && (
                  <a href={`mailto:${location.contactEmail}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                    <Mail className="h-4 w-4" /> {location.contactEmail}
                  </a>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No contact information on file.</p>
            )}
          </CardContent>
        </Card>

        {/* Access Notes */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-amber-500" /> Access Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {location.accessNotes ? (
              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">{location.accessNotes}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No access notes recorded.</p>
            )}
          </CardContent>
        </Card>

        {/* General Notes */}
        {location.notes && (
          <Card className="border-border shadow-sm md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" /> Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{location.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Linked Jobs */}
        <Card className="border-border shadow-sm md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-primary" /> Jobs at this Location
              <Badge variant="secondary" className="ml-auto">{location.jobs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {location.jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs linked to this location yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {location.jobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="flex items-center justify-between py-3 hover:bg-secondary/40 px-2 -mx-2 rounded cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{job.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(job.startDate)} – {job.endDate ? formatDate(job.endDate) : "Ongoing"}
                          </p>
                        </div>
                      </div>
                      <Badge className={`text-xs ${statusColors[job.status] ?? ""}`}>
                        {statusLabels[job.status] ?? job.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>Update the details for this location.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                updateLocation({
                  id: locationId,
                  data: {
                    ...values,
                    zip: values.zip || undefined,
                    contactName: values.contactName || undefined,
                    contactPhone: values.contactPhone || undefined,
                    contactEmail: values.contactEmail || undefined,
                    accessNotes: values.accessNotes || undefined,
                    notes: values.notes || undefined,
                  },
                })
              )}
              className="space-y-4"
            >
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Location Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Street Address *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem><FormLabel>State *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="zip" render={({ field }) => (
                <FormItem><FormLabel>ZIP Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Site Contact</p>
                <div className="space-y-3">
                  <FormField control={form.control} name="contactName" render={({ field }) => (
                    <FormItem><FormLabel>Contact Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="contactPhone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="contactEmail" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>
              </div>
              <FormField control={form.control} name="accessNotes" render={({ field }) => (
                <FormItem><FormLabel>Access Notes</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>General Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
