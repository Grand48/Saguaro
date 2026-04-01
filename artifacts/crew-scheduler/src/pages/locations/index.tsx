import { useState } from "react";
import { Link } from "wouter";
import {
  useListLocations,
  useCreateLocation,
  useDeleteLocation,
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
  DialogTrigger,
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
import { MapPin, Plus, Phone, Mail, Lock, Briefcase, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const createLocationSchema = z.object({
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

type CreateLocationFormValues = z.infer<typeof createLocationSchema>;

function CreateLocationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate: createLocation, isPending } = useCreateLocation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        toast({ title: "Location created" });
        onOpenChange(false);
        form.reset();
      },
      onError: () => toast({ title: "Failed to create location", variant: "destructive" }),
    },
  });

  const form = useForm<CreateLocationFormValues>({
    resolver: zodResolver(createLocationSchema),
    defaultValues: { name: "", address: "", city: "", state: "", zip: "", contactName: "", contactPhone: "", contactEmail: "", accessNotes: "", notes: "" },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Location
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Location</DialogTitle>
          <DialogDescription>Create a new site or location to link to jobs.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              createLocation({ data: { ...values, zip: values.zip || undefined, contactName: values.contactName || undefined, contactPhone: values.contactPhone || undefined, contactEmail: values.contactEmail || undefined, accessNotes: values.accessNotes || undefined, notes: values.notes || undefined } })
            )}
            className="space-y-4"
          >
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Location Name *</FormLabel><FormControl><Input placeholder="Riverside Office Complex" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem><FormLabel>Street Address *</FormLabel><FormControl><Input placeholder="142 Riverside Dr" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem><FormLabel>City *</FormLabel><FormControl><Input placeholder="Austin" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem><FormLabel>State *</FormLabel><FormControl><Input placeholder="TX" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="zip" render={({ field }) => (
              <FormItem><FormLabel>ZIP Code</FormLabel><FormControl><Input placeholder="78701" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Site Contact</p>
              <div className="space-y-3">
                <FormField control={form.control} name="contactName" render={({ field }) => (
                  <FormItem><FormLabel>Contact Name</FormLabel><FormControl><Input placeholder="Greg Patterson" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="contactPhone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="512-555-0100" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="contactEmail" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="contact@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>
            </div>
            <FormField control={form.control} name="accessNotes" render={({ field }) => (
              <FormItem><FormLabel>Access Notes</FormLabel><FormControl><Textarea placeholder="Gate code, parking instructions, key box location..." rows={3} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>General Notes</FormLabel><FormControl><Textarea placeholder="Additional site information..." rows={2} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create Location"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function LocationsList() {
  const { data: locations, isLoading } = useListLocations();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: deleteLocation } = useDeleteLocation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        toast({ title: "Location deleted" });
      },
      onError: () => toast({ title: "Failed to delete location", variant: "destructive" }),
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">Manage job sites, contacts, and access information.</p>
        </div>
        <CreateLocationDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border shadow-sm">
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : locations?.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No locations yet</h3>
          <p className="text-muted-foreground mt-1">Add your first job site location to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {locations?.map((loc) => (
            <Card key={loc.id} className="border-border shadow-sm hover:shadow-md transition-shadow group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link href={`/locations/${loc.id}`}>
                      <CardTitle className="text-lg hover:text-primary transition-colors cursor-pointer truncate">
                        {loc.name}
                      </CardTitle>
                    </Link>
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{loc.address}, {loc.city}, {loc.state}{loc.zip ? ` ${loc.zip}` : ""}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => { if (confirm("Delete this location?")) deleteLocation({ id: loc.id }); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loc.contactName && (
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="font-medium text-foreground">{loc.contactName}</span>
                    {loc.contactPhone && (
                      <a href={`tel:${loc.contactPhone}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                        <Phone className="h-3.5 w-3.5" /> {loc.contactPhone}
                      </a>
                    )}
                    {loc.contactEmail && (
                      <a href={`mailto:${loc.contactEmail}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                        <Mail className="h-3.5 w-3.5" /> {loc.contactEmail}
                      </a>
                    )}
                  </div>
                )}

                {loc.accessNotes && (
                  <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                    <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-amber-800 dark:text-amber-200 line-clamp-2">{loc.accessNotes}</span>
                  </div>
                )}

                {loc.jobs.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {loc.jobs.map((j) => (
                      <Link key={j.id} href={`/jobs/${j.id}`}>
                        <Badge variant="outline" className={`text-xs cursor-pointer hover:opacity-80 ${statusColors[j.status] ?? ""}`}>
                          {j.title}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pt-1">No jobs linked</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
