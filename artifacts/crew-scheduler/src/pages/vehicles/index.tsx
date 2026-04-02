import React, { useState, useMemo } from "react";
import {
  Car, Plus, Download, FileSpreadsheet, X, Pencil, Trash2,
  AlertTriangle, Clock, CheckCircle2, ChevronRight, Wrench, User, Hash, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useListVehicles,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useListVehicleMaintenance,
  useCreateVehicleMaintenance,
  useUpdateVehicleMaintenance,
  useDeleteVehicleMaintenance,
  getListVehiclesQueryKey,
  getListVehicleMaintenanceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type Vehicle = {
  id: number;
  vehicleNumber: string;
  make: string;
  model: string;
  year?: string | null;
  licensePlate: string;
  assignedTo?: string | null;
  notes?: string | null;
  createdAt: string;
};

type Maintenance = {
  id: number;
  vehicleId: number;
  type: string;
  status: "completed" | "upcoming" | "needed";
  scheduledDate?: string | null;
  completedDate?: string | null;
  mileage?: number | null;
  cost?: string | null;
  performedBy?: string | null;
  notes?: string | null;
  createdAt: string;
};

const STATUS_CONFIG = {
  needed: { label: "Needed", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500", icon: AlertTriangle },
  upcoming: { label: "Upcoming", color: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-500", icon: Clock },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500", icon: CheckCircle2 },
};

const MAINTENANCE_TYPES = [
  "Oil Change", "Tire Rotation", "Tire Replacement", "Brake Service",
  "Air Filter", "Transmission Service", "Coolant Flush", "Battery Replacement",
  "Inspection / Registration", "Windshield Repair", "Alignment", "Detailing",
  "Other",
];

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function buildVehiclesCsv(vehicles: Vehicle[], maintenanceMap: Record<number, Maintenance[]>): string {
  const lines: string[] = [];
  lines.push(["Vehicle #", "Year", "Make", "Model", "License Plate", "Assigned To", "Notes"].map(q).join(","));
  for (const v of vehicles) {
    lines.push([v.vehicleNumber, v.year ?? "", v.make, v.model, v.licensePlate, v.assignedTo ?? "", v.notes ?? ""].map(q).join(","));
  }
  lines.push("");
  lines.push(["MAINTENANCE RECORDS"].map(q).join(","));
  lines.push(["Vehicle #", "Type", "Status", "Scheduled Date", "Completed Date", "Mileage", "Cost", "Performed By", "Notes"].map(q).join(","));
  for (const v of vehicles) {
    const records = maintenanceMap[v.id] ?? [];
    for (const m of records) {
      lines.push([
        v.vehicleNumber, m.type, m.status,
        m.scheduledDate ?? "", m.completedDate ?? "",
        m.mileage ?? "", m.cost ?? "", m.performedBy ?? "", m.notes ?? "",
      ].map(q).join(","));
    }
  }
  return lines.join("\n");
}

function q(v: string | number) { return `"${String(v).replace(/"/g, '""')}"`; }

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildEmailBody(vehicles: Vehicle[], maintenanceMap: Record<number, Maintenance[]>): string {
  const divider = "─".repeat(60);
  const lines: string[] = ["Company Vehicle Fleet Report", divider];
  for (const v of vehicles) {
    lines.push(`${v.vehicleNumber} | ${v.year ?? ""} ${v.make} ${v.model} | Plate: ${v.licensePlate}${v.assignedTo ? ` | Assigned: ${v.assignedTo}` : ""}`);
    const records = maintenanceMap[v.id] ?? [];
    const needed = records.filter((m) => m.status === "needed");
    const upcoming = records.filter((m) => m.status === "upcoming");
    const completed = records.filter((m) => m.status === "completed");
    if (needed.length) lines.push(`  ⚠ NEEDED: ${needed.map((m) => m.type).join(", ")}`);
    if (upcoming.length) lines.push(`  ○ Upcoming: ${upcoming.map((m) => `${m.type}${m.scheduledDate ? ` (${m.scheduledDate})` : ""}`).join(", ")}`);
    if (completed.length) lines.push(`  ✓ Completed: ${completed.map((m) => `${m.type}${m.completedDate ? ` (${m.completedDate})` : ""}`).join(", ")}`);
    if (!records.length) lines.push("  No maintenance records");
    lines.push("");
  }
  return lines.join("\n");
}

// ─── Vehicle Dialog ───────────────────────────────────────────────────────────

const DEFAULT_V = { vehicleNumber: "", make: "", model: "", year: "", licensePlate: "", assignedTo: "", notes: "" };
type VForm = typeof DEFAULT_V;

function VehicleDialog({ open, editing, onClose, onSave, onDelete, isSaving }: {
  open: boolean; editing: Vehicle | null; onClose: () => void;
  onSave: (f: VForm) => void; onDelete?: () => void; isSaving: boolean;
}) {
  const [form, setForm] = useState<VForm>(DEFAULT_V);
  React.useEffect(() => {
    if (open) setForm(editing ? { vehicleNumber: editing.vehicleNumber, make: editing.make, model: editing.model, year: editing.year ?? "", licensePlate: editing.licensePlate, assignedTo: editing.assignedTo ?? "", notes: editing.notes ?? "" } : DEFAULT_V);
  }, [open, editing]);

  if (!open) return null;
  const f = (k: keyof VForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const canSave = form.vehicleNumber.trim() && form.make.trim() && form.model.trim() && form.licensePlate.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{editing ? "Edit Vehicle" : "Add Vehicle"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vehicle #" value={form.vehicleNumber} onChange={f("vehicleNumber")} placeholder="e.g. V-001" required />
          <Field label="Year" value={form.year} onChange={f("year")} placeholder="e.g. 2023" />
          <Field label="Make" value={form.make} onChange={f("make")} placeholder="e.g. Ford" required />
          <Field label="Model" value={form.model} onChange={f("model")} placeholder="e.g. F-150" required />
          <Field label="License Plate" value={form.licensePlate} onChange={f("licensePlate")} placeholder="e.g. ABC-1234" required />
          <Field label="Assigned To" value={form.assignedTo} onChange={f("assignedTo")} placeholder="Name (optional)" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes <span className="text-muted-foreground">(optional)</span></label>
          <textarea className="w-full min-h-[56px] px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Any notes…" value={form.notes} onChange={f("notes")} />
        </div>
        <div className="flex items-center justify-between pt-1">
          {editing && onDelete ? (
            <button onClick={onDelete} className="flex items-center gap-1.5 text-sm text-destructive hover:underline"><Trash2 className="h-3.5 w-3.5" /> Delete Vehicle</button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={isSaving || !canSave} onClick={() => onSave(form)}>{isSaving ? "Saving…" : editing ? "Update" : "Add Vehicle"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Maintenance Dialog ───────────────────────────────────────────────────────

const DEFAULT_M = { type: "", status: "upcoming" as const, scheduledDate: "", completedDate: "", mileage: "", cost: "", performedBy: "", notes: "" };
type MForm = typeof DEFAULT_M;

function MaintenanceDialog({ open, editing, onClose, onSave, onDelete, isSaving }: {
  open: boolean; editing: Maintenance | null; onClose: () => void;
  onSave: (f: MForm) => void; onDelete?: () => void; isSaving: boolean;
}) {
  const [form, setForm] = useState<MForm>(DEFAULT_M);
  React.useEffect(() => {
    if (open) setForm(editing ? {
      type: editing.type, status: editing.status as any,
      scheduledDate: editing.scheduledDate ?? "", completedDate: editing.completedDate ?? "",
      mileage: editing.mileage != null ? String(editing.mileage) : "",
      cost: editing.cost ?? "", performedBy: editing.performedBy ?? "", notes: editing.notes ?? "",
    } : DEFAULT_M);
  }, [open, editing]);

  if (!open) return null;
  const f = (k: keyof MForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{editing ? "Edit Maintenance" : "Add Maintenance Record"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium">Type <span className="text-destructive">*</span></label>
            <input list="maint-types" className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. Oil Change" value={form.type} onChange={f("type")} autoComplete="off" />
            <datalist id="maint-types">{MAINTENANCE_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium">Status</label>
            <select className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.status} onChange={f("status") as any}>
              <option value="needed">Needed</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <Field label="Scheduled Date" type="date" value={form.scheduledDate} onChange={f("scheduledDate")} />
          <Field label="Completed Date" type="date" value={form.completedDate} onChange={f("completedDate")} />
          <Field label="Mileage" value={form.mileage} onChange={f("mileage")} placeholder="e.g. 45200" type="number" />
          <Field label="Cost" value={form.cost} onChange={f("cost")} placeholder="e.g. $85.00" />
          <Field label="Performed By" value={form.performedBy} onChange={f("performedBy")} placeholder="Shop or technician" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes <span className="text-muted-foreground">(optional)</span></label>
          <textarea className="w-full min-h-[56px] px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Details…" value={form.notes} onChange={f("notes")} />
        </div>
        <div className="flex items-center justify-between pt-1">
          {editing && onDelete ? (
            <button onClick={onDelete} className="flex items-center gap-1.5 text-sm text-destructive hover:underline"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={isSaving || !form.type.trim()} onClick={() => onSave(form)}>{isSaving ? "Saving…" : editing ? "Update" : "Add Record"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required, type = "text" }: {
  label: string; value: string; onChange: (e: any) => void;
  placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}{required && <span className="text-destructive ml-0.5">*</span>}</label>
      <input type={type} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder={placeholder} value={value} onChange={onChange} />
    </div>
  );
}

// ─── Maintenance Panel ────────────────────────────────────────────────────────

function MaintenancePanel({ vehicle, onAddMaintenance }: { vehicle: Vehicle; onAddMaintenance: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "needed" | "upcoming" | "completed">("all");
  const [mDialogOpen, setMDialogOpen] = useState(false);
  const [editingM, setEditingM] = useState<Maintenance | null>(null);

  const { data: rawRecords = [], isLoading } = useListVehicleMaintenance(
    vehicle.id,
    { query: { staleTime: 5000 } }
  );
  const records = rawRecords as Maintenance[];

  const { mutate: createM, isPending: isCreatingM } = useCreateVehicleMaintenance({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListVehicleMaintenanceQueryKey(vehicle.id) });
        setMDialogOpen(false);
        toast({ title: "Maintenance record added" });
      },
    },
  });

  const { mutate: updateM, isPending: isUpdatingM } = useUpdateVehicleMaintenance({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListVehicleMaintenanceQueryKey(vehicle.id) });
        setMDialogOpen(false);
        toast({ title: "Record updated" });
      },
    },
  });

  const { mutate: deleteM } = useDeleteVehicleMaintenance({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListVehicleMaintenanceQueryKey(vehicle.id) });
        setMDialogOpen(false);
        toast({ title: "Record deleted" });
      },
    },
  });

  const filtered = records.filter((r) => filter === "all" || r.status === filter);
  const counts = { needed: records.filter((r) => r.status === "needed").length, upcoming: records.filter((r) => r.status === "upcoming").length, completed: records.filter((r) => r.status === "completed").length };

  function handleSaveM(form: MForm) {
    const payload = {
      vehicleId: vehicle.id,
      type: form.type,
      status: form.status,
      scheduledDate: form.scheduledDate || undefined,
      completedDate: form.completedDate || undefined,
      mileage: form.mileage ? parseInt(form.mileage) : undefined,
      cost: form.cost || undefined,
      performedBy: form.performedBy || undefined,
      notes: form.notes || undefined,
    };
    if (editingM) updateM({ id: editingM.id, data: payload });
    else createM({ id: vehicle.id, data: payload });
  }

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          {(["all", "needed", "upcoming", "completed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === s ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s === "all" ? `All (${records.length})` : `${STATUS_CONFIG[s].label} (${counts[s]})`}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => { setEditingM(null); setMDialogOpen(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Record
        </Button>
      </div>

      {/* Records */}
      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <Wrench className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? "No maintenance records yet" : `No ${filter} maintenance`}
          </p>
          {filter === "all" && <Button size="sm" variant="outline" onClick={() => { setEditingM(null); setMDialogOpen(true); }} className="gap-1.5 mx-auto"><Plus className="h-3.5 w-3.5" /> Add First Record</Button>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.upcoming;
            const Icon = cfg.icon;
            return (
              <div key={m.id} className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors group">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{m.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    {m.scheduledDate && <span>Scheduled: <span className="text-foreground font-medium">{m.scheduledDate}</span></span>}
                    {m.completedDate && <span>Completed: <span className="text-foreground font-medium">{m.completedDate}</span></span>}
                    {m.mileage != null && <span>Mileage: <span className="text-foreground font-medium">{m.mileage.toLocaleString()}</span></span>}
                    {m.cost && <span>Cost: <span className="text-foreground font-medium">{m.cost}</span></span>}
                    {m.performedBy && <span>By: <span className="text-foreground font-medium">{m.performedBy}</span></span>}
                  </div>
                  {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                </div>
                <button
                  onClick={() => { setEditingM(m); setMDialogOpen(true); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <MaintenanceDialog
        key={mDialogOpen ? `open-${editingM?.id ?? "new"}` : "closed"}
        open={mDialogOpen}
        editing={editingM}
        onClose={() => setMDialogOpen(false)}
        onSave={handleSaveM}
        onDelete={editingM ? () => deleteM({ id: editingM.id }) : undefined}
        isSaving={isCreatingM || isUpdatingM}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [vDialogOpen, setVDialogOpen] = useState(false);
  const [editingV, setEditingV] = useState<Vehicle | null>(null);
  const [maintenanceMap, setMaintenanceMap] = useState<Record<number, Maintenance[]>>({});

  const { data: rawVehicles = [], isLoading } = useListVehicles({ query: { staleTime: 5000 } });
  const vehicles = rawVehicles as Vehicle[];
  const selectedVehicle = vehicles.find((v) => v.id === selectedId) ?? null;

  const { mutate: createVehicle, isPending: isCreatingV } = useCreateVehicle({
    mutation: {
      onSuccess: (v) => {
        qc.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
        setVDialogOpen(false);
        setSelectedId((v as Vehicle).id);
        toast({ title: "Vehicle added" });
      },
    },
  });

  const { mutate: updateVehicle, isPending: isUpdatingV } = useUpdateVehicle({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
        setVDialogOpen(false);
        toast({ title: "Vehicle updated" });
      },
    },
  });

  const { mutate: deleteVehicle } = useDeleteVehicle({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
        setVDialogOpen(false);
        setSelectedId(null);
        toast({ title: "Vehicle deleted" });
      },
    },
  });

  function handleSaveV(form: VForm) {
    const payload = {
      vehicleNumber: form.vehicleNumber,
      make: form.make,
      model: form.model,
      year: form.year || undefined,
      licensePlate: form.licensePlate,
      assignedTo: form.assignedTo || undefined,
      notes: form.notes || undefined,
    };
    if (editingV) updateVehicle({ id: editingV.id, data: payload });
    else createVehicle({ data: payload });
  }

  async function handleExport() {
    const csv = buildVehiclesCsv(vehicles, maintenanceMap);
    downloadCsv(csv, `Vehicles_Fleet_Report.csv`);
  }

  async function handleEmailExport() {
    handleExport();
    setTimeout(() => {
      const body = buildEmailBody(vehicles, maintenanceMap);
      const subject = encodeURIComponent("Company Vehicle Fleet Report");
      window.open(`mailto:?subject=${subject}&body=${encodeURIComponent(body)}`);
    }, 400);
  }

  // Compute fleet-wide maintenance stats from already-loaded vehicles
  const allMaintenanceCounts = useMemo(() => {
    let needed = 0, upcoming = 0;
    for (const recs of Object.values(maintenanceMap)) {
      needed += recs.filter((r) => r.status === "needed").length;
      upcoming += recs.filter((r) => r.status === "upcoming").length;
    }
    return { needed, upcoming };
  }, [maintenanceMap]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" />
            Company Vehicles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Fleet management · Maintenance tracking</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Download CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleEmailExport} className="gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Spreadsheet + Email
          </Button>
          <Button size="sm" onClick={() => { setEditingV(null); setVDialogOpen(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Vehicle
          </Button>
        </div>
      </div>

      {/* Fleet Summary */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Vehicles</p>
            <p className="text-2xl font-bold">{vehicles.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Assigned</p>
            <p className="text-2xl font-bold">{vehicles.filter((v) => v.assignedTo).length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium text-yellow-600">Upcoming Maintenance</p>
            <p className="text-2xl font-bold text-yellow-600">{allMaintenanceCounts.upcoming}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium text-red-600">Maintenance Needed</p>
            <p className="text-2xl font-bold text-red-600">{allMaintenanceCounts.needed}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading vehicles…</div>
      ) : vehicles.length === 0 ? (
        <Card className="p-16 text-center">
          <Car className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-lg mb-1">No vehicles yet</p>
          <p className="text-sm text-muted-foreground mb-4">Add your first company vehicle to start tracking maintenance.</p>
          <Button onClick={() => { setEditingV(null); setVDialogOpen(true); }} className="gap-1.5 mx-auto"><Plus className="h-4 w-4" /> Add First Vehicle</Button>
        </Card>
      ) : (
        <div className={`grid gap-4 ${selectedVehicle ? "lg:grid-cols-[340px_1fr]" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
          {/* Vehicle Cards */}
          <div className={`space-y-3 ${selectedVehicle ? "" : "contents"}`}>
            {vehicles.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                isSelected={v.id === selectedId}
                onSelect={() => setSelectedId(v.id === selectedId ? null : v.id)}
                onEdit={() => { setEditingV(v); setVDialogOpen(true); }}
                onMaintenanceLoad={(recs) => setMaintenanceMap((p) => ({ ...p, [v.id]: recs }))}
              />
            ))}
          </div>

          {/* Detail Panel */}
          {selectedVehicle && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">{selectedVehicle.vehicleNumber} — {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</h2>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> {selectedVehicle.licensePlate}</span>
                        {selectedVehicle.assignedTo && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {selectedVehicle.assignedTo}</span>}
                      </div>
                      {selectedVehicle.notes && <p className="text-xs text-muted-foreground mt-1">{selectedVehicle.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingV(selectedVehicle); setVDialogOpen(true); }} className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <MaintenancePanel vehicle={selectedVehicle} onAddMaintenance={() => {}} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      <VehicleDialog
        key={vDialogOpen ? `open-${editingV?.id ?? "new"}` : "closed"}
        open={vDialogOpen}
        editing={editingV}
        onClose={() => setVDialogOpen(false)}
        onSave={handleSaveV}
        onDelete={editingV ? () => deleteVehicle({ id: editingV.id }) : undefined}
        isSaving={isCreatingV || isUpdatingV}
      />
    </div>
  );
}

// ─── Vehicle Card ─────────────────────────────────────────────────────────────

function VehicleCard({ vehicle, isSelected, onSelect, onEdit, onMaintenanceLoad }: {
  vehicle: Vehicle;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onMaintenanceLoad: (recs: Maintenance[]) => void;
}) {
  const { data: rawRecords = [] } = useListVehicleMaintenance(
    vehicle.id,
    { query: { staleTime: 5000, enabled: true } }
  );
  const records = rawRecords as Maintenance[];

  React.useEffect(() => {
    if (records.length > 0) onMaintenanceLoad(records);
  }, [records]);

  const needed = records.filter((r) => r.status === "needed").length;
  const upcoming = records.filter((r) => r.status === "upcoming").length;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary shadow-md" : "hover:ring-1 hover:ring-border"}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-primary text-sm">{vehicle.vehicleNumber}</span>
              <span className="font-semibold text-sm text-foreground">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> {vehicle.licensePlate}</span>
              {vehicle.assignedTo && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {vehicle.assignedTo}</span>}
            </div>
            {/* Maintenance badges */}
            {(needed > 0 || upcoming > 0) && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {needed > 0 && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-medium">
                    <AlertTriangle className="h-3 w-3" /> {needed} needed
                  </span>
                )}
                {upcoming > 0 && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 font-medium">
                    <Clock className="h-3 w-3" /> {upcoming} upcoming
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? "rotate-90 text-primary" : ""}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
