import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListNotifications, getListNotificationsQueryKey,
  useCreateNotification,
  useDeleteNotification,
  useGetCrewNotifications, getGetCrewNotificationsQueryKey,
  useMarkNotificationRead,
  useGetCrewUnreadCount, getGetCrewUnreadCountQueryKey,
  useListCrew,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";
import { Bell, BellRing, Megaphone, Trash2, CheckCheck, AlertTriangle, Info, AlertCircle, ChevronDown, ChevronUp, Users } from "lucide-react";

// ─── Priority config ───────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", className: "bg-red-100 text-red-800", icon: AlertCircle, border: "border-l-red-500" },
  high:   { label: "High",   className: "bg-amber-100 text-amber-800", icon: AlertTriangle, border: "border-l-amber-500" },
  normal: { label: "Normal", className: "bg-blue-100 text-blue-800", icon: Info, border: "border-l-blue-400" },
  low:    { label: "Low",    className: "bg-gray-100 text-gray-600", icon: Bell, border: "border-l-gray-300" },
};

type Priority = keyof typeof PRIORITY_CONFIG;

// ─── Identity selector ─────────────────────────────────────────────────────

function useCrewIdentity() {
  const [crewId, setCrewId] = useState<number | null>(() => {
    const v = localStorage.getItem("cc_crew_id");
    return v ? parseInt(v) : null;
  });
  const persist = (id: number) => {
    localStorage.setItem("cc_crew_id", String(id));
    setCrewId(id);
    window.dispatchEvent(new Event("cc_crew_id_changed"));
  };
  return { crewId, setCrewId: persist };
}

function IdentityBanner({ crewId, onSelect }: { crewId: number | null; onSelect: (id: number) => void }) {
  const { data: crew } = useListCrew();
  if (crewId) return null;
  return (
    <Card className="border-amber-200 bg-amber-50 mb-6">
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4">
        <Bell className="h-6 w-6 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900">Who are you?</p>
          <p className="text-sm text-amber-700 mt-0.5">Select your name to see your inbox and mark notifications as read.</p>
        </div>
        <Select onValueChange={(v) => onSelect(parseInt(v))}>
          <SelectTrigger className="w-52 border-amber-300 bg-white">
            <SelectValue placeholder="Select your name…" />
          </SelectTrigger>
          <SelectContent>
            {crew?.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

// ─── Compose form ──────────────────────────────────────────────────────────

const composeSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  message: z.string().min(10, "Please provide a more detailed message"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  createdBy: z.string().min(1, "Sender name is required"),
});

type ComposeFormValues = z.infer<typeof composeSchema>;

function ComposePanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<ComposeFormValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: { title: "", message: "", priority: "normal", createdBy: "Foreman" },
  });

  const { mutate: createNotification, isPending } = useCreateNotification({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        form.reset({ title: "", message: "", priority: "normal", createdBy: form.getValues("createdBy") });
        toast({ title: "Notification sent to all crew" });
      },
      onError: () => toast({ title: "Failed to send", variant: "destructive" }),
    },
  });

  return (
    <Card className="border-border shadow-sm mb-6">
      <CardHeader className="border-b border-border bg-muted/20">
        <CardTitle className="text-lg flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Send Notification to All Crew
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => createNotification({ data: v }))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Subject / Title *</FormLabel>
                  <FormControl><Input placeholder="Safety briefing at 7am tomorrow" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="createdBy" render={({ field }) => (
                <FormItem>
                  <FormLabel>From</FormLabel>
                  <FormControl><Input placeholder="Foreman" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Message *</FormLabel>
                  <FormControl><Textarea placeholder="All crew must complete site induction before arrival…" rows={4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending} className="gap-2">
                <Megaphone className="h-4 w-4" />
                {isPending ? "Sending…" : "Send to All Crew"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ─── Sent Notifications list ───────────────────────────────────────────────

function SentNotificationsList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: notifications, isLoading } = useListNotifications({
    query: { queryKey: getListNotificationsQueryKey() },
  });
  const [expanded, setExpanded] = useState<number | null>(null);

  const { mutate: deleteNotif } = useDeleteNotification({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        toast({ title: "Notification deleted" });
      },
    },
  });

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  if (!notifications || notifications.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-16 text-center text-muted-foreground">
          <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No notifications sent yet</p>
          <p className="text-sm mt-1">Compose a message above to broadcast to all crew.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="border-b border-border bg-muted/20">
        <CardTitle className="text-base flex items-center gap-2">
          <BellRing className="h-4 w-4 text-primary" />
          Sent Notifications
          <Badge variant="secondary" className="ml-1">{notifications.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {notifications.map((n) => {
            const cfg = PRIORITY_CONFIG[n.priority as Priority] ?? PRIORITY_CONFIG.normal;
            const readPct = n.totalCrew > 0 ? Math.round((n.readCount / n.totalCrew) * 100) : 0;
            const isOpen = expanded === n.id;
            return (
              <div key={n.id} className={`border-l-4 ${cfg.border}`}>
                <div
                  className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-muted/20 group"
                  onClick={() => setExpanded(isOpen ? null : n.id)}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <cfg.icon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{n.title}</p>
                        <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">From {n.createdBy} · {formatDate(n.createdAt)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{n.readCount}/{n.totalCrew} read</span>
                        </div>
                        <Progress value={readPct} className="h-1.5 w-24" />
                        <span className="text-xs text-muted-foreground">{readPct}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${n.title}"?`)) deleteNotif({ id: n.id }); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 ml-7 text-sm text-muted-foreground whitespace-pre-wrap border-t border-border/50 pt-3 bg-muted/10">
                    {n.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Inbox (crew view) ─────────────────────────────────────────────────────

function InboxPanel({ crewId }: { crewId: number }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: notifications, isLoading } = useGetCrewNotifications(crewId, {
    query: { queryKey: getGetCrewNotificationsQueryKey(crewId) },
  });

  const { mutate: markRead } = useMarkNotificationRead({
    mutation: {
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: getGetCrewNotificationsQueryKey(crewId) });
        queryClient.invalidateQueries({ queryKey: getGetCrewUnreadCountQueryKey(crewId) });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      },
    },
  });

  const handleExpand = (n: any) => {
    setExpanded(expanded === n.id ? null : n.id);
    if (!n.isRead) {
      markRead({ id: n.id, data: { crewId } });
    }
  };

  const markAllRead = () => {
    notifications?.filter((n) => !n.isRead).forEach((n) => {
      markRead({ id: n.id, data: { crewId } });
    });
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  const unread = notifications?.filter((n) => !n.isRead).length ?? 0;

  if (!notifications || notifications.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-16 text-center text-muted-foreground">
          <CheckCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm mt-1">You'll see messages from your foreman or admin here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="border-b border-border bg-muted/20 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Inbox
          {unread > 0 && <Badge className="bg-destructive text-destructive-foreground text-xs">{unread} unread</Badge>}
        </CardTitle>
        {unread > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs gap-1.5">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {notifications.map((n) => {
            const cfg = PRIORITY_CONFIG[n.priority as Priority] ?? PRIORITY_CONFIG.normal;
            const isOpen = expanded === n.id;
            return (
              <div key={n.id} className={`border-l-4 ${cfg.border} ${!n.isRead ? "bg-primary/[0.03]" : ""}`}>
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/20 group"
                  onClick={() => handleExpand(n)}
                >
                  <div className="mt-0.5 shrink-0">
                    {!n.isRead ? (
                      <div className="w-2 h-2 rounded-full bg-primary mt-1" />
                    ) : (
                      <CheckCheck className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm ${!n.isRead ? "font-bold" : "font-medium text-muted-foreground"}`}>{n.title}</p>
                      <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">From {n.createdBy} · {formatDate(n.createdAt)}</p>
                    {!isOpen && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{n.message}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-muted-foreground">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 ml-7 text-sm whitespace-pre-wrap border-t border-border/50 pt-3 bg-muted/10">
                    {n.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function Notifications() {
  const { crewId, setCrewId } = useCrewIdentity();
  const [activeTab, setActiveTab] = useState(crewId ? "inbox" : "send");

  useEffect(() => {
    if (crewId && activeTab === "send") setActiveTab("inbox");
  }, [crewId]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          Notifications
        </h1>
        <p className="text-muted-foreground mt-1">Broadcast messages to all crew members instantly.</p>
      </div>

      <IdentityBanner crewId={crewId} onSelect={(id) => { setCrewId(id); setActiveTab("inbox"); }} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-xs h-auto p-1 bg-muted/50">
          <TabsTrigger value="inbox" className="py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Bell className="h-4 w-4 mr-1.5" /> Inbox
          </TabsTrigger>
          <TabsTrigger value="send" className="py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Megaphone className="h-4 w-4 mr-1.5" /> Send
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-6 outline-none focus-visible:ring-0">
          {crewId ? (
            <InboxPanel crewId={crewId} />
          ) : (
            <Card className="border-border">
              <CardContent className="py-16 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Select your name above to view your inbox</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="send" className="mt-6 outline-none focus-visible:ring-0">
          <ComposePanel />
          <SentNotificationsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
