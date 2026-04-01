import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGetJob, useListJobTasks, useListJobEquipment, useListJobContacts } from "@workspace/api-client-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "Scheduled", color: "#2563eb", bg: "#dbeafe" },
  in_progress: { label: "In Progress", color: "#d97706", bg: "#fef3c7" },
  completed: { label: "Completed", color: "#16a34a", bg: "#dcfce7" },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "#fee2e2" },
};

const TABS = ["Overview", "Tasks", "Crew", "Contacts"] as const;

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = parseInt(id ?? "0");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");

  const { data: job, isLoading } = useGetJob(jobId, { query: { enabled: !!jobId } });
  const { data: tasks } = useListJobTasks(jobId, { query: { enabled: !!jobId } });
  const { data: equipment } = useListJobEquipment(jobId, { query: { enabled: !!jobId } });
  const { data: contacts } = useListJobContacts(jobId, { query: { enabled: !!jobId } });

  const s = makeStyles(colors);
  const cfg = job ? (STATUS_CONFIG[job.status] ?? STATUS_CONFIG.scheduled) : null;

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Job not found</Text>
      </View>
    );
  }

  const completedTasks = (tasks ?? []).filter((t: any) => t.completed).length;
  const totalTasks = (tasks ?? []).length;
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Custom header */}
      <View style={[s.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{job.name}</Text>
          {cfg && (
            <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[s.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={[s.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 40 }}>
        {activeTab === "Overview" && (
          <View style={{ gap: 12 }}>
            {/* Meta card */}
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <InfoRow icon="location-outline" label="Location" value={job.location ?? "Not set"} colors={colors} />
              {job.startDate && (
                <InfoRow icon="calendar-outline" label="Start"
                  value={new Date(job.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  colors={colors} />
              )}
              {job.endDate && (
                <InfoRow icon="flag-outline" label="End"
                  value={new Date(job.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  colors={colors} />
              )}
            </View>

            {/* Task progress */}
            {totalTasks > 0 && (
              <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.cardTitle, { color: colors.foreground }]}>Task Progress</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={[s.progressLabel, { color: colors.mutedForeground }]}>{completedTasks} of {totalTasks} complete</Text>
                  <Text style={[s.progressPct, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
                </View>
                <View style={[s.progressBar, { backgroundColor: colors.muted }]}>
                  <View style={[s.progressFill, { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` as any }]} />
                </View>
              </View>
            )}

            {/* Notes */}
            {job.notes && (
              <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.cardTitle, { color: colors.foreground }]}>Notes</Text>
                <Text style={[s.notes, { color: colors.mutedForeground }]}>{job.notes}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === "Tasks" && (
          <View style={{ gap: 8 }}>
            {(tasks ?? []).length === 0 ? (
              <EmptyState icon="checkbox-outline" text="No tasks for this job" colors={colors} />
            ) : (
              (tasks ?? []).map((task: any) => (
                <View key={task.id} style={[s.taskRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons
                    name={task.completed ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={task.completed ? colors.primary : colors.mutedForeground}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.taskName, { color: colors.foreground, textDecorationLine: task.completed ? "line-through" : "none" }]}>
                      {task.description}
                    </Text>
                    {task.assignedTo && (
                      <Text style={[s.taskAssigned, { color: colors.mutedForeground }]}>
                        {task.assignedTo}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "Crew" && (
          <View style={{ gap: 8 }}>
            {(job.crew ?? []).length === 0 ? (
              <EmptyState icon="people-outline" text="No crew assigned" colors={colors} />
            ) : (
              (job.crew ?? []).map((member: any) => (
                <View key={member.id} style={[s.crewRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[s.crewAvatar, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[s.crewInitials, { color: colors.primary }]}>
                      {member.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") ?? "?"}
                    </Text>
                  </View>
                  <View>
                    <Text style={[s.crewName, { color: colors.foreground }]}>{member.name}</Text>
                    <Text style={[s.crewRole, { color: colors.mutedForeground }]}>{member.role}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "Contacts" && (
          <View style={{ gap: 8 }}>
            {(contacts ?? []).length === 0 ? (
              <EmptyState icon="call-outline" text="No contacts added" colors={colors} />
            ) : (
              (contacts ?? []).map((contact: any) => (
                <View key={contact.id} style={[s.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[s.contactAvatar, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[s.contactInitials, { color: colors.primary }]}>
                      {contact.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.contactName, { color: colors.foreground }]}>{contact.name}</Text>
                    <Text style={[s.contactRole, { color: colors.primary }]}>{contact.role}</Text>
                    {contact.phone && (
                      <Text style={[s.contactInfo, { color: colors.mutedForeground }]}>
                        <Ionicons name="call-outline" size={12} /> {contact.phone}
                      </Text>
                    )}
                    {contact.email && (
                      <Text style={[s.contactInfo, { color: colors.mutedForeground }]}>
                        <Ionicons name="mail-outline" size={12} /> {contact.email}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, width: 60 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground, flex: 1 }}>{value}</Text>
    </View>
  );
}

function EmptyState({ icon, text, colors }: { icon: any; text: string; colors: any }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
      <Ionicons name={icon} size={40} color={colors.mutedForeground} />
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{text}</Text>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    header: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, gap: 8 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4, alignSelf: "flex-start" },
    statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    tabRow: { borderBottomWidth: 1, maxHeight: 46 },
    tab: { paddingHorizontal: 18, paddingVertical: 14 },
    tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    card: { borderRadius: 16, borderWidth: 1, padding: 16 },
    cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
    progressLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
    progressPct: { fontSize: 13, fontFamily: "Inter_700Bold" },
    progressBar: { height: 8, borderRadius: 4, marginTop: 8, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 4 },
    notes: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginTop: 8 },
    taskRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
    taskName: { fontSize: 14, fontFamily: "Inter_500Medium" },
    taskAssigned: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    crewRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
    crewAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    crewInitials: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    crewName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    crewRole: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    contactCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
    contactAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    contactInitials: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    contactName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    contactRole: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 },
    contactInfo: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  });
