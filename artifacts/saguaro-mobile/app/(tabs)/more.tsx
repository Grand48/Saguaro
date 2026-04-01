import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useGetCrewUnreadCount } from "@workspace/api-client-react";

type MenuItem = {
  icon: string;
  label: string;
  badge?: number;
  onPress: () => void;
  destructive?: boolean;
};

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [crewId, setCrewId] = useState<number | null>(null);
  const [crewName, setCrewName] = useState<string>("Unknown");

  useEffect(() => {
    AsyncStorage.getItem("cc_crew_id").then((v) => { if (v) setCrewId(parseInt(v)); });
    AsyncStorage.getItem("cc_crew_name").then((v) => { if (v) setCrewName(v); });
  }, []);

  const { data: unreadData } = useGetCrewUnreadCount(crewId!, {
    query: { enabled: !!crewId, refetchInterval: 30000 }
  });
  const unread = unreadData?.unread ?? 0;

  const clearIdentity = async () => {
    await AsyncStorage.multiRemove(["cc_crew_id", "cc_crew_name"]);
    setCrewId(null);
    setCrewName("Unknown");
  };

  const s = makeStyles(colors);

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Operations",
      items: [
        {
          icon: "notifications-outline",
          label: "Notifications",
          badge: unread > 0 ? unread : undefined,
          onPress: () => router.push("/notifications" as any),
        },
        {
          icon: "calendar-clear-outline",
          label: "Time Off Requests",
          onPress: () => router.push("/time-off" as any),
        },
        {
          icon: "location-outline",
          label: "Job Sites",
          onPress: () => router.push("/locations" as any),
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          icon: "person-circle-outline",
          label: crewName !== "Unknown" ? `Signed in as ${crewName}` : "Select Identity",
          onPress: () => router.push("/select-crew" as any),
        },
        {
          icon: "log-out-outline",
          label: "Clear Identity",
          onPress: clearIdentity,
          destructive: true,
        },
      ],
    },
  ];

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 90 }}>
        <View style={s.headerRow}>
          <Text style={[s.title, { color: colors.foreground }]}>More</Text>
        </View>

        {/* Avatar block */}
        <View style={[s.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.avatar, { backgroundColor: colors.primary + "20" }]}>
            <Ionicons name="person-outline" size={28} color={colors.primary} />
          </View>
          <View>
            <Text style={[s.profileName, { color: colors.foreground }]}>
              {crewName !== "Unknown" ? crewName : "Field Crew"}
            </Text>
            <Text style={[s.profileRole, { color: colors.mutedForeground }]}>Saguaro Field App</Text>
          </View>
        </View>

        {sections.map((sec) => (
          <View key={sec.title} style={s.section}>
            <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>{sec.title.toUpperCase()}</Text>
            <View style={[s.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {sec.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  {idx > 0 && <View style={[s.divider, { backgroundColor: colors.border }]} />}
                  <TouchableOpacity
                    style={s.menuItem}
                    onPress={item.onPress}
                    activeOpacity={0.7}
                  >
                    <View style={[s.menuIcon, { backgroundColor: item.destructive ? "#fee2e2" : colors.accent }]}>
                      <Ionicons
                        name={item.icon as any}
                        size={18}
                        color={item.destructive ? colors.destructive : colors.primary}
                      />
                    </View>
                    <Text style={[
                      s.menuLabel,
                      { color: item.destructive ? colors.destructive : colors.foreground },
                    ]}>
                      {item.label}
                    </Text>
                    <View style={s.menuRight}>
                      {item.badge != null && (
                        <View style={[s.badgeView, { backgroundColor: colors.destructive }]}>
                          <Text style={s.badgeText}>{item.badge > 9 ? "9+" : item.badge}</Text>
                        </View>
                      )}
                      {!item.destructive && (
                        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                      )}
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        <Text style={[s.version, { color: colors.mutedForeground }]}>Saguaro v2.4 · Field Operations Management</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    headerRow: { paddingHorizontal: 20, marginBottom: 16 },
    title: { fontSize: 26, fontFamily: "Inter_700Bold" },
    profileCard: {
      marginHorizontal: 20, borderRadius: 16, borderWidth: 1,
      padding: 16, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24,
    },
    avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
    profileName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
    profileRole: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
    section: { paddingHorizontal: 20, marginBottom: 20 },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 8 },
    menuCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
    menuItem: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
    menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
    menuRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    divider: { height: 1, marginLeft: 62 },
    badgeView: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: "center" },
    badgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
    version: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
  });
