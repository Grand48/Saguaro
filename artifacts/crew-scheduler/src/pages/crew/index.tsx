import { useState } from "react";
import { Link } from "wouter";
import { useListCrew, useCreateCrewMember, getListCrewQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const createCrewSchema = z.object({
  name: z.string().min(2, "Name is required"),
  role: z.string().min(2, "Role is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export default function CrewList() {
  const { data: crew, isLoading } = useListCrew();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Crew</h1>
          <p className="text-muted-foreground">Manage your team and their assignments.</p>
        </div>
        <CreateCrewDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="border-border shadow-sm">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2 w-full flex flex-col items-center">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !crew || crew.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="p-12 text-center text-muted-foreground">
            <div className="bg-secondary/50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No crew members</h3>
            <p>Add people to your team to start assigning jobs.</p>
            <Button onClick={() => setIsCreateOpen(true)} className="mt-6 font-semibold" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {crew.map((member) => (
            <Link key={member.id} href={`/crew/${member.id}`}>
              <Card className="h-full cursor-pointer hover:border-primary/50 hover:shadow-md transition-all border-border shadow-sm group">
                <CardContent className="p-6 flex flex-col items-center text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-16 bg-muted/30 border-b border-border z-0"></div>
                  
                  <Avatar className="h-20 w-20 border-4 border-card bg-secondary text-secondary-foreground shadow-sm relative z-10 mt-2 mb-3">
                    <AvatarImage src={member.avatarUrl || ""} />
                    <AvatarFallback className="text-xl font-bold bg-secondary">
                      {member.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1 relative z-10 w-full">
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate px-2">{member.name}</h3>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-semibold uppercase text-[10px] tracking-wider px-2 py-0.5">
                      {member.role}
                    </Badge>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-border w-full flex justify-center gap-4 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full pointer-events-none hover:bg-transparent">
                        <Phone className={`h-4 w-4 ${member.phone ? 'text-primary' : 'opacity-20'}`} />
                      </Button>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full pointer-events-none hover:bg-transparent">
                        <Mail className={`h-4 w-4 ${member.email ? 'text-primary' : 'opacity-20'}`} />
                      </Button>
                    </div>
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

function CreateCrewDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createCrew = useCreateCrewMember();
  
  const form = useForm<z.infer<typeof createCrewSchema>>({
    resolver: zodResolver(createCrewSchema),
    defaultValues: {
      name: "",
      role: "",
      phone: "",
      email: "",
    },
  });

  const onSubmit = (values: z.infer<typeof createCrewSchema>) => {
    createCrew.mutate({
      data: {
        ...values,
        phone: values.phone || undefined,
        email: values.email || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Crew Member Added", description: "Successfully added to the team." });
        queryClient.invalidateQueries({ queryKey: getListCrewQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        form.reset();
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to add member. Please try again.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="font-semibold shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Crew Member</DialogTitle>
          <DialogDescription>
            Enter the details for the new team member.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="E.g., Jane Smith" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem><FormLabel>Role / Title</FormLabel><FormControl><Input placeholder="E.g., Electrician, General Laborer" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone Number (Optional)</FormLabel><FormControl><Input placeholder="(555) 123-4567" type="tel" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email Address (Optional)</FormLabel><FormControl><Input placeholder="jane@example.com" type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createCrew.isPending}>{createCrew.isPending ? "Adding..." : "Add Member"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}