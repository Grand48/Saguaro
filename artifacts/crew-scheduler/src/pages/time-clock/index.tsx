import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useClockIn, useClockOut,
  useGetActiveTimeEntry, getGetActiveTimeEntryQueryKey,
  useListCrewTimeEntries, getListCrewTimeEntriesQueryKey,
  useListActiveTimeEntries, getListActiveTimeEntriesQueryKey,
  useListTimeEntries, getListTimeEntriesQueryKey,
  useDeleteTimeEntry,
  useListCrew,
  useListJobs,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Clock, LogIn, LogOut, Users, Briefcase, Trash2, CalendarDays, Timer, CheckCircle2, AlertCircle, MapPin } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useStoredCrewId() {
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

function useLiveTimer(startTime: string | null | undefined) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startTime) { setElapsed(0); return; }
    const update = () => setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  return elapsed;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

function formatDurationHM(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getEntryDuration(entry: any): number {
  const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now();
  return Math.floor((end - new Date(entry.clockIn).getTime()) / 1000);
}

function formatTime(dt: string | Date) {
  return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(dt: string | Date) {
  return new Date(dt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

// ─── Identity banner ──────────────────────────────────────────────────────────

function IdentityBanner({ crewId, onSelect }: { crewId: number | null; onSelect: (id: number) => void }) {
  const { data: crew } = useListCrew();
  if (crewId) return null;
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4">
        <Clock className="h-6 w-6 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900">Who are you?</p>
          <p className="text-sm text-amber-700 mt-0.5">Select your name to clock in or out.</p>
        </div>
        <Select onValueChange={(v) => onSelect(parseInt(v))}>
          <SelectTrigger className="w-52 border-amber-300 bg-white shrink-0">
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

// ─── Clock Panel ──────────────────────────────────────────────────────────────

function ClockPanel({ crewId }: { crewId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: jobs } = useListJobs();
  const { data: crew } = useListCrew();

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const crewMember = crew?.find((c) => c.id === crewId);
  const activeJobs = jobs?.filter((j) => j.status === "in_progress" || j.status === "scheduled") ?? [];

  const { data: activeEntry, isLoading: activeLoading } = useGetActiveTimeEntry(crewId, {
    query: {
      queryKey: getGetActiveTimeEntryQueryKey(crewId),
      refetchInterval: 30000,
    },
  });

  const elapsed = useLiveTimer(activeEntry?.clockIn);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetActiveTimeEntryQueryKey(crewId) });
    queryClient.invalidateQueries({ queryKey: getListCrewTimeEntriesQueryKey(crewId) });
    queryClient.invalidateQueries({ queryKey: getListActiveTimeEntriesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
  }, [crewId, queryClient]);

  const { mutate: clockIn, isPending: clockingIn } = useClockIn({
    mutation: {
      onSuccess: () => { invalidateAll(); toast({ title: "Clocked in!" }); setNotes(""); setShowNotes(false); },
      onError: (err: any) => toast({ title: "Already clocked in", description: "Clock out first before clocking in again.", variant: "destructive" }),
    },
  });

  const { mutate: clockOut, isPending: clockingOut } = useClockOut({
    mutation: {
      onSuccess: (entry: any) => {
        invalidateAll();
        const dur = entry.clockOut ? getEntryDuration(entry) : 0;
        toast({ title: "Clocked out", description: `Session: ${formatDuration(dur)}` });
        setNotes("");
        setShowNotes(false);
      },
      onError: () => toast({ title: "Failed to clock out", variant: "destructive" }),
    },
  });

  const handleClockIn = () => {
    clockIn({
      data: {
        crewId,
        jobId: selectedJobId ? parseInt(selectedJobId) : undefined,
        notes: notes || undefined,
      },
    });
  };

  const handleClockOut = () => {
    clockOut({ data: { crewId, notes: notes || undefined } });
  };

  if (activeLoading) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="py-12 flex items-center justify-center">
          <Skeleton className="h-32 w-64" />
        </CardContent>
      </Card>
    );
  }

  const isClockedIn = !!activeEntry;

  return (
    <Card className={`border-2 shadow-sm transition-colors duration-500 ${isClockedIn ? "border-green-400 bg-green-50/30" : "border-border"}`}>
      <CardContent className="py-8 flex flex-col items-center gap-6">

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isClockedIn ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
          <span className={`text-sm font-semibold ${isClockedIn ? "text-green-700" : "text-muted-foreground"}`}>
            {isClockedIn ? "Currently Clocked In" : "Not Clocked In"}
          </span>
        </div>

        {/* Crew name */}
        {crewMember && (
          <div className="text-center">
            <p className="text-2xl font-bold">{crewMember.name}</p>
            <p className="text-sm text-muted-foreground">{crewMember.role}</p>
          </div>
        )}

        {/* Live timer / status */}
        {isClockedIn ? (
          <div className="text-center space-y-1">
            <div className="font-mono text-5xl font-bold tabular-nums text-green-700">
              {formatDuration(elapsed)}
            </div>
            <p className="text-sm text-muted-foreground">
              Since {formatTime(activeEntry.clockIn)} · {formatDateShort(activeEntry.clockIn)}
            </p>
            {activeEntry.jobTitle && (
              <Badge variant="outline" className="gap-1 mt-1 border-green-300 text-green-700">
                <Briefcase className="h-3 w-3" /> {activeEntry.jobTitle}
              </Badge>
            )}
          </div>
        ) : (
          <div className="text-center space-y-3">
            <div className="text-5xl font-bold text-muted-foreground/30">
              00:00
            </div>
            <p className="text-sm text-muted-foreground">Ready to start your shift</p>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a job (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific job</SelectItem>
                {activeJobs.map((j) => (
                  <SelectItem key={j.id} value={String(j.id)}>
                    <div className="flex flex-col">
                      <span>{j.title}</span>
                      <span className="text-xs text-muted-foreground">{j.location}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Notes toggle */}
        <div className="w-full max-w-sm space-y-2">
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className="text-xs text-primary hover:underline"
          >
            {showNotes ? "Hide notes" : "Add a note (optional)"}
          </button>
          {showNotes && (
            <Textarea
              placeholder="Any notes for this shift…"
              className="resize-none text-sm"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </div>

        {/* Action button */}
        {isClockedIn ? (
          <Button
            size="lg"
            variant="destructive"
            className="w-48 h-14 text-lg font-bold gap-2 shadow-md"
            disabled={clockingOut}
            onClick={handleClockOut}
          >
            <LogOut className="h-5 w-5" />
            {clockingOut ? "Clocking Out…" : "Clock Out"}
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-48 h-14 text-lg font-bold gap-2 shadow-md bg-green-600 hover:bg-green-700"
            disabled={clockingIn}
            onClick={handleClockIn}
          >
            <LogIn className="h-5 w-5" />
            {clockingIn ? "Clocking In…" : "Clock In"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── My Timesheet ─────────────────────────────────────────────────────────────

function MyTimesheet({ crewId }: { crewId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: entries, isLoading } = useListCrewTimeEntries(crewId, {
    query: { queryKey: getListCrewTimeEntriesQueryKey(crewId) },
  });

  const { mutate: deleteEntry } = useDeleteTimeEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCrewTimeEntriesQueryKey(crewId) });
        queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
        toast({ title: "Entry removed" });
      },
    },
  });

  // Group by date
  const grouped: Record<string, any[]> = {};
  (entries ?? []).forEach((e) => {
    const key = formatDateShort(e.clockIn);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  const totalThisWeek = (() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return (entries ?? [])
      .filter((e) => e.clockOut && new Date(e.clockIn).getTime() > weekAgo)
      .reduce((sum, e) => sum + getEntryDuration(e), 0);
  })();

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">This Week</p>
            <p className="text-2xl font-bold text-primary">{formatDurationHM(totalThisWeek)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Total Sessions</p>
            <p className="text-2xl font-bold text-primary">{entries?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Entry list grouped by date */}
      {Object.keys(grouped).length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-14 text-center text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No time entries yet</p>
            <p className="text-sm mt-1">Clock in to start tracking your hours.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, dayEntries]) => {
            const dayTotal = dayEntries.filter((e) => e.clockOut).reduce((s, e) => s + getEntryDuration(e), 0);
            return (
              <Card key={date} className="border-border shadow-sm">
                <CardHeader className="py-3 px-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{date}</span>
                  </div>
                  {dayTotal > 0 && (
                    <span className="text-sm font-bold text-primary">{formatDurationHM(dayTotal)}</span>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {dayEntries.map((entry) => {
                      const dur = getEntryDuration(entry);
                      const isActive = !entry.clockOut;
                      return (
                        <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 group hover:bg-muted/10">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"}`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-mono font-medium">
                                  {formatTime(entry.clockIn)}
                                  {entry.clockOut ? ` → ${formatTime(entry.clockOut)}` : " → Now"}
                                </span>
                                <Badge variant="outline" className={`text-xs ${isActive ? "border-green-300 text-green-700" : ""}`}>
                                  {isActive ? <><Timer className="h-3 w-3 mr-1" />Active</> : formatDurationHM(dur)}
                                </Badge>
                              </div>
                              {entry.jobTitle && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Briefcase className="h-3 w-3" /> {entry.jobTitle}
                                </p>
                              )}
                              {entry.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{entry.notes}</p>}
                            </div>
                          </div>
                          {!isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                              onClick={() => { if (confirm("Remove this time entry?")) deleteEntry({ id: entry.id }); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Team Status ──────────────────────────────────────────────────────────────

function TeamStatus() {
  const { data: activeEntries, isLoading: activeLoading } = useListActiveTimeEntries({
    query: {
      queryKey: getListActiveTimeEntriesQueryKey(),
      refetchInterval: 30000,
    },
  });
  const { data: allEntries, isLoading: allLoading } = useListTimeEntries({
    query: { queryKey: getListTimeEntriesQueryKey() },
  });
  const { data: crew } = useListCrew();

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceUpdate((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Today's entries
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEntries = (allEntries ?? []).filter((e) => new Date(e.clockIn) >= todayStart);

  // Stats
  const totalToday = todayEntries.filter((e) => e.clockOut).reduce((s, e) => s + getEntryDuration(e), 0);
  const clockedInNow = activeEntries?.length ?? 0;

  if (activeLoading || allLoading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="py-3 px-4 text-center">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">On Site Now</p>
            <p className="text-3xl font-bold text-green-600">{clockedInNow}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="py-3 px-4 text-center">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Sessions Today</p>
            <p className="text-3xl font-bold text-primary">{todayEntries.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="py-3 px-4 text-center">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Hours Today</p>
            <p className="text-3xl font-bold text-primary">{formatDurationHM(totalToday)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Currently clocked in */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/20 py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Currently On Site
            {clockedInNow > 0 && <Badge className="bg-green-100 text-green-700 border-0 text-xs">{clockedInNow} active</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!activeEntries || activeEntries.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nobody clocked in right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activeEntries.map((entry) => {
                const dur = Math.floor((Date.now() - new Date(entry.clockIn).getTime()) / 1000);
                return (
                  <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bg-green-100 rounded-full p-2 shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{entry.crewName}</p>
                        <p className="text-xs text-muted-foreground">{entry.crewRole}</p>
                        {entry.jobTitle && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3" /> {entry.jobTitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-bold text-green-700">{formatDurationHM(dur)}</p>
                      <p className="text-xs text-muted-foreground">since {formatTime(entry.clockIn)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's full log */}
      {todayEntries.length > 0 && (
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border bg-muted/20 py-3 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Today's Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {todayEntries.map((entry) => {
                const dur = getEntryDuration(entry);
                const isActive = !entry.clockOut;
                return (
                  <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{entry.crewName}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {formatTime(entry.clockIn)}{entry.clockOut ? ` → ${formatTime(entry.clockOut)}` : " → Now"}
                        </p>
                        {entry.jobTitle && <p className="text-xs text-muted-foreground">{entry.jobTitle}</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${isActive ? "border-green-300 text-green-700" : ""}`}>
                      {isActive ? "Active" : formatDurationHM(dur)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TimeClock() {
  const { crewId, setCrewId } = useStoredCrewId();
  const [tab, setTab] = useState("clock");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            Time Clock
          </h1>
          <p className="text-muted-foreground mt-1">Clock in and out of your shifts.</p>
        </div>
        {crewId && (
          <button
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
            onClick={() => { localStorage.removeItem("cc_crew_id"); window.dispatchEvent(new Event("cc_crew_id_changed")); window.location.reload(); }}
          >
            Switch identity
          </button>
        )}
      </div>

      <IdentityBanner crewId={crewId} onSelect={setCrewId} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-sm h-auto p-1 bg-muted/50">
          <TabsTrigger value="clock" className="py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Clock className="h-4 w-4 mr-1.5" /> Clock
          </TabsTrigger>
          <TabsTrigger value="my" className="py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm" disabled={!crewId}>
            <CalendarDays className="h-4 w-4 mr-1.5" /> My Hours
          </TabsTrigger>
          <TabsTrigger value="team" className="py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="h-4 w-4 mr-1.5" /> Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clock" className="mt-6 outline-none focus-visible:ring-0">
          {crewId ? (
            <ClockPanel crewId={crewId} />
          ) : (
            <Card className="border-border">
              <CardContent className="py-16 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Select your name above to clock in</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my" className="mt-6 outline-none focus-visible:ring-0">
          {crewId ? <MyTimesheet crewId={crewId} /> : null}
        </TabsContent>

        <TabsContent value="team" className="mt-6 outline-none focus-visible:ring-0">
          <TeamStatus />
        </TabsContent>
      </Tabs>
    </div>
  );
}
