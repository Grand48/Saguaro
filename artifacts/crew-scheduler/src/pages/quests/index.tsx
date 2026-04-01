import { useState } from "react";
import {
  useListSideQuests,
  useCreateSideQuest,
  useUpdateSideQuest,
  useDeleteSideQuest,
  getListSideQuestsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Zap,
  Plus,
  Lock,
  Unlock,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SideQuest = {
  id: number;
  title: string;
  description?: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "claimed" | "completed";
  adminLocked: boolean;
  claimedByCrewId?: number | null;
  claimedAt?: string | null;
  completedAt?: string | null;
  claimedBy?: { id: number; name: string; role?: string } | null;
};

const PRIORITY_CONFIG = {
  low: { label: "Low", class: "bg-gray-100 text-gray-600 border-gray-200" },
  medium: { label: "Medium", class: "bg-amber-50 text-amber-600 border-amber-200" },
  high: { label: "High", class: "bg-red-50 text-red-600 border-red-200" },
  urgent: { label: "Urgent", class: "bg-red-100 text-red-700 border-red-300" },
};

const STATUS_CONFIG = {
  open: { label: "Open", class: "bg-gray-100 text-gray-600 border-gray-200", Icon: Circle },
  claimed: { label: "Claimed", class: "bg-blue-50 text-blue-600 border-blue-200", Icon: AlertCircle },
  completed: { label: "Completed", class: "bg-green-50 text-green-600 border-green-200", Icon: CheckCircle2 },
};

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  adminLocked: z.boolean().default(true),
});

type CreateForm = z.infer<typeof createSchema>;

export default function SideQuestsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "claimed" | "completed">("all");
  const [lockFilter, setLockFilter] = useState<"all" | "locked" | "unlocked">("all");

  const { data: quests = [], isLoading } = useListSideQuests();

  const { mutate: createQuest, isPending: isCreating } = useCreateSideQuest({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSideQuestsQueryKey() });
        setShowCreate(false);
        form.reset();
      },
    },
  });

  const { mutate: updateQuest } = useUpdateSideQuest({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListSideQuestsQueryKey() }),
    },
  });

  const { mutate: deleteQuest } = useDeleteSideQuest({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSideQuestsQueryKey() });
        setDeleteId(null);
      },
    },
  });

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", description: "", priority: "medium", adminLocked: true },
  });

  const filtered = (quests as SideQuest[]).filter((q) => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (lockFilter === "locked" && !q.adminLocked) return false;
    if (lockFilter === "unlocked" && q.adminLocked) return false;
    return true;
  });

  const toggleLock = (quest: SideQuest) => {
    updateQuest({ id: quest.id, data: { adminLocked: !quest.adminLocked } });
  };

  const stats = {
    total: (quests as SideQuest[]).length,
    open: (quests as SideQuest[]).filter((q) => q.status === "open").length,
    claimed: (quests as SideQuest[]).filter((q) => q.status === "claimed").length,
    completed: (quests as SideQuest[]).filter((q) => q.status === "completed").length,
    locked: (quests as SideQuest[]).filter((q) => q.adminLocked).length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            Side Quests
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage optional unscheduled tasks. Lock quests to prevent crew from claiming them.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Quest
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Open", value: stats.open, color: "text-muted-foreground" },
          { label: "Claimed", value: stats.claimed, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, color: "text-green-600" },
          { label: "Locked", value: stats.locked, color: "text-amber-600" },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 p-1 bg-muted rounded-md">
          {(["all", "open", "claimed", "completed"] as const).map((f) => (
            <button
              key={f}
              className={cn(
                "px-3 py-1 rounded text-sm font-medium transition-colors",
                statusFilter === f ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setStatusFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-muted rounded-md">
          {(["all", "locked", "unlocked"] as const).map((f) => (
            <button
              key={f}
              className={cn(
                "px-3 py-1 rounded text-sm font-medium transition-colors",
                lockFilter === f ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setLockFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quest List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No quests found. Create one to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((quest) => {
            const StatusIcon = STATUS_CONFIG[quest.status]?.Icon ?? Circle;
            return (
              <Card key={quest.id} className={cn("transition-opacity", quest.adminLocked && "opacity-70")}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <StatusIcon
                      className={cn(
                        "h-5 w-5 mt-0.5 shrink-0",
                        quest.status === "completed" ? "text-green-500" :
                        quest.status === "claimed" ? "text-blue-500" : "text-muted-foreground"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={cn("font-semibold text-sm leading-5", quest.status === "completed" && "line-through text-muted-foreground")}>
                          {quest.title}
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={cn("text-xs", PRIORITY_CONFIG[quest.priority]?.class)}>
                            {PRIORITY_CONFIG[quest.priority]?.label}
                          </Badge>
                          <Badge variant="outline" className={cn("text-xs", STATUS_CONFIG[quest.status]?.class)}>
                            {STATUS_CONFIG[quest.status]?.label}
                          </Badge>
                        </div>
                      </div>
                      {quest.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{quest.description}</p>
                      )}
                      {quest.claimedBy && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>Claimed by {quest.claimedBy.name}</span>
                        </div>
                      )}
                    </div>
                    {/* Admin actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("gap-1.5 text-xs h-8", !quest.adminLocked && "border-green-300 text-green-700 hover:bg-green-50")}
                        onClick={() => toggleLock(quest)}
                        title={quest.adminLocked ? "Unlock for crew" : "Lock from crew"}
                      >
                        {quest.adminLocked ? (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            Locked
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3.5 w-3.5" />
                            Unlocked
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(quest.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Side Quest</DialogTitle>
            <DialogDescription>
              Create an optional unscheduled task. Quests start locked — unlock them when you're ready for crew to claim.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) =>
                createQuest({ data: { ...data, adminLocked: data.adminLocked } })
              )}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Clear debris from site B" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional details..." className="resize-none" rows={3} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adminLocked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial State</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "locked")}
                        defaultValue={field.value ? "locked" : "unlocked"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="locked">Locked</SelectItem>
                          <SelectItem value="unlocked">Unlocked</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Quest"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quest</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the quest and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteQuest({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
