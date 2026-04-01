import React, { useState, useMemo, useCallback } from "react";
import { Building2, ChevronLeft, ChevronRight, Plus, Download, Mail, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useListLodgingBookings,
  useCreateLodgingBooking,
  useUpdateLodgingBooking,
  useDeleteLodgingBooking,
  getListLodgingBookingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const ROOMS = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const ROOM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  C1:  { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
  C2:  { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  C3:  { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" },
  C4:  { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  C5:  { bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" },
  C6:  { bg: "#ffedd5", text: "#c2410c", border: "#fdba74" },
  C7:  { bg: "#cffafe", text: "#155e75", border: "#67e8f9" },
  C8:  { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
  C9:  { bg: "#fdf2f8", text: "#86198f", border: "#e879f9" },
  C10: { bg: "#f1f5f9", text: "#334155", border: "#94a3b8" },
};

type Booking = {
  id: number;
  room: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  notes?: string | null;
  createdAt: string;
};

type Segment =
  | { type: "empty"; days: number }
  | { type: "booking"; days: number; booking: Booking };

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function monthStr(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function nightsBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function getRowSegments(bookings: Booking[], year: number, month: number): Segment[] {
  const total = daysInMonth(year, month);
  const mStr = monthStr(year, month);
  const mEnd = `${mStr}-${String(total).padStart(2, "0")}`;

  const overlap = bookings
    .filter((b) => b.checkIn <= mEnd && b.checkOut >= `${mStr}-01`)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  const segments: Segment[] = [];
  let cursor = 1;

  for (const b of overlap) {
    const effectiveStart = b.checkIn.substring(0, 7) < mStr ? 1 : parseInt(b.checkIn.split("-")[2]);
    const effectiveEnd =
      b.checkOut.substring(0, 7) > mStr ? total : parseInt(b.checkOut.split("-")[2]);

    const clippedStart = Math.max(cursor, effectiveStart);
    const clippedEnd = Math.min(total, effectiveEnd);

    if (clippedStart > cursor) {
      segments.push({ type: "empty", days: clippedStart - cursor });
    }
    if (clippedEnd >= clippedStart) {
      segments.push({ type: "booking", days: clippedEnd - clippedStart + 1, booking: b });
      cursor = clippedEnd + 1;
    }
    if (cursor > total) break;
  }

  if (cursor <= total) {
    segments.push({ type: "empty", days: total - cursor + 1 });
  }

  return segments;
}

function buildCsvContent(bookings: Booking[], year: number, month: number): string {
  const header = ["Room", "Guest Name", "Check-In", "Check-Out", "Nights Stayed", "Notes"];
  const mStr = monthStr(year, month);
  const mEnd = `${mStr}-${String(daysInMonth(year, month)).padStart(2, "0")}`;
  const rows = bookings
    .filter((b) => b.checkIn <= mEnd && b.checkOut >= `${mStr}-01`)
    .sort((a, b) => a.room.localeCompare(b.room) || a.checkIn.localeCompare(b.checkIn))
    .map((b) => [
      b.room,
      b.guestName,
      b.checkIn,
      b.checkOut,
      nightsBetween(b.checkIn, b.checkOut),
      b.notes ?? "",
    ]);
  return [header, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
}

const DEFAULT_FORM = { room: "C1", guestName: "", checkIn: "", checkOut: "", notes: "" };
type BookingForm = typeof DEFAULT_FORM;

function BookingDialog({
  open,
  editing,
  onClose,
  onSave,
  onDelete,
  isSaving,
}: {
  open: boolean;
  editing: Booking | null;
  onClose: () => void;
  onSave: (form: BookingForm) => void;
  onDelete?: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<BookingForm>(
    editing
      ? { room: editing.room, guestName: editing.guestName, checkIn: editing.checkIn, checkOut: editing.checkOut, notes: editing.notes ?? "" }
      : DEFAULT_FORM
  );
  React.useEffect(() => {
    if (open) {
      setForm(
        editing
          ? { room: editing.room, guestName: editing.guestName, checkIn: editing.checkIn, checkOut: editing.checkOut, notes: editing.notes ?? "" }
          : DEFAULT_FORM
      );
    }
  }, [open, editing]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{editing ? "Edit Booking" : "Add Booking"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Room</label>
            <select
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.room}
              onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))}
            >
              {ROOMS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Guest Name</label>
            <input
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Full name"
              value={form.guestName}
              onChange={(e) => setForm((p) => ({ ...p, guestName: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Check-In</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.checkIn}
                onChange={(e) => setForm((p) => ({ ...p, checkIn: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Check-Out</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.checkOut}
                onChange={(e) => setForm((p) => ({ ...p, checkOut: e.target.value }))}
              />
            </div>
          </div>

          {form.checkIn && form.checkOut && form.checkOut > form.checkIn && (
            <p className="text-xs text-muted-foreground">
              {nightsBetween(form.checkIn, form.checkOut)} night{nightsBetween(form.checkIn, form.checkOut) !== 1 ? "s" : ""}
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes <span className="text-muted-foreground">(optional)</span></label>
            <textarea
              className="w-full min-h-[60px] px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Any notes…"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {editing && onDelete ? (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 text-sm text-destructive hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              disabled={isSaving || !form.room || !form.guestName.trim() || !form.checkIn || !form.checkOut || form.checkOut <= form.checkIn}
              onClick={() => onSave(form)}
            >
              {isSaving ? "Saving…" : editing ? "Update" : "Add Booking"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LodgingPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [prefilledRoom, setPrefilledRoom] = useState<string | null>(null);
  const [prefilledDay, setPrefilledDay] = useState<number | null>(null);

  const mStr = monthStr(year, month);
  const totalDays = daysInMonth(year, month);

  const { data: rawBookings = [], isLoading } = useListLodgingBookings(
    { month: mStr },
    { query: { staleTime: 10000 } }
  );
  const bookings = rawBookings as Booking[];

  const { mutate: createBooking, isPending: isCreating } = useCreateLodgingBooking({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLodgingBookingsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Booking added" });
      },
    },
  });

  const { mutate: updateBooking, isPending: isUpdating } = useUpdateLodgingBooking({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLodgingBookingsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Booking updated" });
      },
    },
  });

  const { mutate: deleteBooking } = useDeleteLodgingBooking({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLodgingBookingsQueryKey() });
        setDialogOpen(false);
        toast({ title: "Booking deleted" });
      },
    },
  });

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  function openAdd(room?: string, day?: number) {
    setEditingBooking(null);
    setPrefilledRoom(room ?? null);
    setPrefilledDay(day ?? null);
    setDialogOpen(true);
  }

  function openEdit(b: Booking) {
    setEditingBooking(b);
    setPrefilledRoom(null);
    setPrefilledDay(null);
    setDialogOpen(true);
  }

  function handleSave(form: BookingForm) {
    if (editingBooking) {
      updateBooking({ id: editingBooking.id, data: form });
    } else {
      createBooking({ data: form });
    }
  }

  function handleDelete() {
    if (!editingBooking) return;
    deleteBooking({ id: editingBooking.id });
  }

  function downloadCsv() {
    const csv = buildCsvContent(bookings, year, month);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Lodging_${MONTH_NAMES[month - 1]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function emailReport() {
    const csv = buildCsvContent(bookings, year, month);
    const subject = encodeURIComponent(`Lodging Report — ${MONTH_NAMES[month - 1]} ${year}`);
    const body = encodeURIComponent(
      `Lodging report for ${MONTH_NAMES[month - 1]} ${year}:\n\n` + csv.replace(/"/g, "")
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  const bookingsByRoom = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const room of ROOMS) map[room] = [];
    for (const b of bookings) {
      if (map[b.room]) map[b.room].push(b);
    }
    return map;
  }, [bookings]);

  const dayNumbers = Array.from({ length: totalDays }, (_, i) => i + 1);

  const dialogInitial: BookingForm = useMemo(() => ({
    room: prefilledRoom ?? "C1",
    guestName: "",
    checkIn: prefilledDay ? `${mStr}-${String(prefilledDay).padStart(2, "0")}` : "",
    checkOut: "",
    notes: "",
  }), [prefilledRoom, prefilledDay, mStr]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Company Lodging
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Rooms C1 – C10 · Track check-ins and check-outs</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={downloadCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={emailReport} className="gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Email Report
          </Button>
          <Button size="sm" onClick={() => openAdd()} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Booking
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center gap-3">
        <button onClick={prevMonth} className="p-1.5 rounded-md border border-border hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold min-w-[160px] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button onClick={nextMonth} className="p-1.5 rounded-md border border-border hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Summary Cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Total Bookings</p>
              <p className="text-2xl font-bold text-foreground">{bookings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Rooms Occupied</p>
              <p className="text-2xl font-bold text-foreground">
                {new Set(bookings.map((b) => b.room)).size}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Total Guest-Nights</p>
              <p className="text-2xl font-bold text-foreground">
                {bookings.reduce((sum, b) => sum + nightsBetween(b.checkIn, b.checkOut), 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Rooms Available</p>
              <p className="text-2xl font-bold text-foreground">
                {ROOMS.length - new Set(bookings.map((b) => b.room)).size}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse" style={{ minWidth: `${totalDays * 36 + 80}px` }}>
                <thead>
                  <tr className="bg-muted/60 border-b border-border">
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground border-r border-border w-14 sticky left-0 bg-muted/80 z-10">
                      Room
                    </th>
                    {dayNumbers.map((d) => {
                      const dateStr = `${mStr}-${String(d).padStart(2, "0")}`;
                      const dow = new Date(dateStr).getDay();
                      const isWeekend = dow === 0 || dow === 6;
                      return (
                        <th
                          key={d}
                          className={`text-center py-2 font-semibold border-r border-border last:border-r-0 ${isWeekend ? "text-primary/70" : "text-muted-foreground"}`}
                          style={{ minWidth: "32px" }}
                        >
                          {d}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ROOMS.map((room, ri) => {
                    const segments = getRowSegments(bookingsByRoom[room], year, month);
                    const colors = ROOM_COLORS[room];
                    return (
                      <tr key={room} className={ri % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                        <td className="px-3 py-1.5 font-semibold text-foreground border-r border-border sticky left-0 bg-inherit z-10">
                          {room}
                        </td>
                        {segments.map((seg, si) =>
                          seg.type === "empty" ? (
                            <td
                              key={si}
                              colSpan={seg.days}
                              className="border-r border-border last:border-r-0 p-0.5"
                              onClick={() => {
                                let dayCursor = 1;
                                for (let s = 0; s < si; s++) dayCursor += segments[s].days;
                                openAdd(room, dayCursor);
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              <div
                                className="h-8 rounded hover:bg-primary/10 transition-colors"
                                title={`Add booking for ${room}`}
                              />
                            </td>
                          ) : (
                            <td
                              key={si}
                              colSpan={seg.days}
                              className="p-0.5 border-r border-border last:border-r-0"
                            >
                              <div
                                className="h-8 rounded flex items-center px-2 cursor-pointer hover:brightness-95 transition-all overflow-hidden"
                                style={{
                                  backgroundColor: colors.bg,
                                  border: `1px solid ${colors.border}`,
                                  color: colors.text,
                                }}
                                title={`${seg.booking.guestName} · ${nightsBetween(seg.booking.checkIn, seg.booking.checkOut)} nights`}
                                onClick={() => openEdit(seg.booking)}
                              >
                                <span className="truncate font-medium" style={{ fontSize: "10px" }}>
                                  {seg.booking.guestName}
                                </span>
                              </div>
                            </td>
                          )
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings List */}
      {bookings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {MONTH_NAMES[month - 1]} {year} — All Bookings
          </h3>
          <div className="space-y-2">
            {[...bookings]
              .sort((a, b) => a.room.localeCompare(b.room) || a.checkIn.localeCompare(b.checkIn))
              .map((b) => {
                const nights = nightsBetween(b.checkIn, b.checkOut);
                const colors = ROOM_COLORS[b.room] ?? ROOM_COLORS["C1"];
                return (
                  <Card key={b.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-0">
                        <div className="w-2 self-stretch flex-shrink-0" style={{ backgroundColor: colors.border }} />
                        <div className="flex items-center gap-4 flex-1 p-4 min-w-0">
                          <div
                            className="flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                          >
                            {b.room}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">{b.guestName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {b.checkIn} → {b.checkOut} · {nights} night{nights !== 1 ? "s" : ""}
                            </p>
                            {b.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{b.notes}</p>}
                          </div>
                          <button
                            onClick={() => openEdit(b)}
                            className="flex-shrink-0 p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {bookings.length === 0 && !isLoading && (
        <Card className="p-12 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">No bookings for {MONTH_NAMES[month - 1]} {year}</p>
          <p className="text-sm text-muted-foreground mb-4">Click a cell in the calendar or use the button above to add a booking.</p>
          <Button size="sm" onClick={() => openAdd()} className="gap-1.5 mx-auto">
            <Plus className="h-3.5 w-3.5" /> Add First Booking
          </Button>
        </Card>
      )}

      {/* Dialog */}
      <BookingDialog
        open={dialogOpen}
        editing={editingBooking}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onDelete={editingBooking ? handleDelete : undefined}
        isSaving={isCreating || isUpdating}
      />
    </div>
  );
}
