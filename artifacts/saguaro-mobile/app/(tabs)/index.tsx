import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  useGetDashboardSummary,
  useGetUpcomingJobs,
} from "@workspace/api-client-react";

function StatusBadge({ status }: { status: string }) {
  const colors = useColors();
  const map: Record<string, { label: string; color: string; bg: string }> = {
    scheduled: { label: "Scheduled", color: "#2563eb", bg: "#dbeafe" },
    in_progress: { label: "In Progress", color: "#d97706", bg: "#fef3c7" },
    completed: { label: "Completed", color: colors.primary, bg: colors.accent },
    cancelled: { label: "Cancelled", color: colors.destructive, bg: "#fee2e2" },
  };
  const s = map[status] ?? { label: status, color: colors.mutedForeground, bg: colors.muted };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } =
    useGetDashboardSummary({ query: { refetchInterval: 60000 } });
  const { data: upcoming, isLoading: loadingUpcoming, refetch: refetchUpcoming } =
    useGetUpcomingJobs({ query: { refetchInterval: 60000 } });

  const refreshing = loadingSummary || loadingUpcoming;
  const onRefresh = () => { refetchSummary(); refetchUpcoming(); };

  const s = makeStyles(colors);

  const stats = [
    { label: "Active Jobs", value: summary?.activeJobs ?? 0, icon: "briefcase-outline" as const, color: colors.primary },
    { label: "Total Crew", value: summary?.totalCrew ?? 0, icon: "people-outline" as const, color: "#2563eb" },
    { label: "Pending Tasks", value: summary?.pendingTasks ?? 0, icon: "checkbox-outline" as const, color: "#d97706" },
    { label: "Completed", value: summary?.completedJobs ?? 0, icon: "checkmark-circle-outline" as const, color: "#16a34a" },
  ];

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 90 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.greeting, { color: colors.mutedForeground }]}>Good morning</Text>
            <Text style={[s.title, { color: colors.foreground }]}>Command Center</Text>
          </View>
          <View style={[s.logoBox, { backgroundColor: colors.primary }]}>
            <Ionicons name="leaf" size={20} color="#fff" />
          </View>
        </View>

        {/* Stats Grid */}
        {loadingSummary ? (
          <ActivityIndicator color={colors.primary} style={{ margin: 24 }} />
        ) : (
          <View style={s.statsGrid}>
            {stats.map((stat) => (
              <View key={stat.label} style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[s.statIcon, { backgroundColor: stat.color + "18" }]}>
                  <Ionicons name={stat.icon} size={20} color={stat.color} />
                </View>
                <Text style={[s.statValue, { color: colors.foreground }]}>{stat.value}</Text>
                <Text style={[s.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming Jobs */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.foreground }]}>Upcoming Schedule</Text>
          {loadingUpcoming ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />
          ) : !upcoming || upcoming.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={32} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No upcoming jobs</Text>
            </View>
          ) : (
            upcoming.map((job: any) => (
              <TouchableOpacity
                key={job.id}
                style={[s.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/job/${job.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={s.jobRow}>
                  <View style={[s.jobDot, { backgroundColor: colors.primary }]} />
                  <View style={s.jobInfo}>
                    <Text style={[s.jobName, { color: colors.foreground }]}>{job.name}</Text>
                    <View style={s.jobMeta}>
                      <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                      <Text style={[s.jobLocation, { color: colors.mutedForeground }]}>{job.location}</Text>
                    </View>
                  </View>
                  <View style={s.jobRight}>
                    <StatusBadge status={job.status} />
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={{ marginTop: 4 }} />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
    greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
    title: { fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 2 },
    logoBox: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 8, marginBottom: 24 },
    statCard: { width: "47%", marginHorizontal: "1.5%", padding: 16, borderRadius: 16, borderWidth: 1 },
    statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
    statValue: { fontSize: 28, fontFamily: "Inter_700Bold" },
    statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    section: { paddingHorizontal: 20 },
    sectionTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
    emptyCard: { padding: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 8 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
    jobCard: { borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
    jobRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
    jobDot: { width: 8, height: 8, borderRadius: 4 },
    jobInfo: { flex: 1 },
    jobName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    jobMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    jobLocation: { fontSize: 12, fontFamily: "Inter_400Regular" },
    jobRight: { alignItems: "flex-end", gap: 4 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  });

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
