import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useListCrewTimeOff } from "@workspace/api-client-react";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#d97706", bg: "#fef3c7" },
  approved: { label: "Approved", color: "#16a34a", bg: "#dcfce7" },
  denied: { label: "Denied", color: "#ef4444", bg: "#fee2e2" },
};

export default function TimeOffScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [crewId, setCrewId] = useState<number | null>(null);
  useEffect(() => {
    AsyncStorage.getItem("cc_crew_id").then((v) => { if (v) setCrewId(parseInt(v)); });
  }, []);

  const { data: requests, isLoading } = useListCrewTimeOff(crewId!, {
    query: { enabled: !!crewId }
  });

  const s = makeStyles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Time Off Requests</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={requests ?? []}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 20 }}
          scrollEnabled={(requests?.length ?? 0) > 0}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="calendar-clear-outline" size={48} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No requests</Text>
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
                {crewId ? "No time off requests found" : "Select your identity in More tab"}
              </Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.pending;
            return (
              <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={s.cardTop}>
                  <Text style={[s.dateRange, { color: colors.foreground }]}>
                    {new Date(item.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" – "}
                    {new Date(item.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </Text>
                  <View style={[s.badge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                {item.reason && (
                  <Text style={[s.reason, { color: colors.mutedForeground }]}>{item.reason}</Text>
                )}
              </View>
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
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
    },
    backBtn: { width: 32 },
    headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
    card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    dateRange: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
    reason: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 6 },
    empty: { alignItems: "center", paddingTop: 80, gap: 8 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  });
