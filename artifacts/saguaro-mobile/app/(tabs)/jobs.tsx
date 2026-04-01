import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useListJobs } from "@workspace/api-client-react";

const STATUS_FILTERS = ["all", "scheduled", "in_progress", "completed"] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  scheduled: { label: "Scheduled", color: "#2563eb", bg: "#dbeafe", icon: "calendar-outline" },
  in_progress: { label: "In Progress", color: "#d97706", bg: "#fef3c7", icon: "construct-outline" },
  completed: { label: "Completed", color: "#16a34a", bg: "#dcfce7", icon: "checkmark-circle-outline" },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "#fee2e2", icon: "close-circle-outline" },
};

export default function JobsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: jobs, isLoading, refetch } = useListJobs({
    query: { refetchInterval: 30000 }
  });

  const filtered = (jobs ?? []).filter((j: any) => {
    const matchStatus = filter === "all" || j.status === filter;
    const matchSearch = !search || j.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const s = makeStyles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[s.title, { color: colors.foreground }]}>Jobs</Text>
        <View style={[s.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search jobs..."
            placeholderTextColor={colors.mutedForeground}
            style={[s.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          />
        </View>
      </View>

      {/* Filter Chips */}
      <View style={[s.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              s.chip,
              filter === f
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.muted },
            ]}
          >
            <Text style={[
              s.chipText,
              { color: filter === f ? "#fff" : colors.mutedForeground },
            ]}>
              {f === "all" ? "All" : STATUS_CONFIG[f]?.label ?? f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 90 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          scrollEnabled={filtered.length > 0}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="briefcase-outline" size={48} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No jobs found</Text>
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
                {search ? "Try a different search" : "No jobs match this filter"}
              </Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.scheduled;
            return (
              <TouchableOpacity
                style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/job/${item.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={s.cardHeader}>
                  <View style={[s.statusIcon, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.jobName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[s.jobLocation, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.location ?? "No location"}
                    </Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                {(item.startDate || item.endDate) && (
                  <View style={[s.cardFooter, { borderTopColor: colors.border }]}>
                    <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
                    <Text style={[s.dateText, { color: colors.mutedForeground }]}>
                      {item.startDate
                        ? new Date(item.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : ""}{" "}
                      {item.endDate
                        ? `– ${new Date(item.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : ""}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
    title: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 12 },
    searchBar: {
      flexDirection: "row", alignItems: "center", borderRadius: 12,
      borderWidth: 1, paddingHorizontal: 12, height: 40, gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14 },
    filterRow: {
      flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10,
      gap: 8, borderBottomWidth: 1,
    },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    card: { borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
    cardHeader: { flexDirection: "row", alignItems: "center", padding: 14 },
    statusIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    jobName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    jobLocation: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    cardFooter: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1,
    },
    dateText: { fontSize: 12, fontFamily: "Inter_400Regular" },
    empty: { alignItems: "center", paddingTop: 80, gap: 8 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  });
