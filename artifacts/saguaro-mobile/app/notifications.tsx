import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGetCrewNotifications } from "@workspace/api-client-react";
import { useState, useEffect } from "react";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [crewId, setCrewId] = useState<number | null>(null);
  useEffect(() => {
    AsyncStorage.getItem("cc_crew_id").then((v) => { if (v) setCrewId(parseInt(v)); });
  }, []);

  const { data: notifications, isLoading } = useGetCrewNotifications(crewId!, {
    query: { enabled: !!crewId }
  });

  const s = makeStyles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={notifications ?? []}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 20 }}
          scrollEnabled={(notifications?.length ?? 0) > 0}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="notifications-outline" size={48} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>All caught up</Text>
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No notifications yet</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[s.icon, { backgroundColor: colors.accent }]}>
                <Ionicons name="notifications-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.notifTitle, { color: colors.foreground }]}>{item.title ?? item.message}</Text>
                {item.body && <Text style={[s.notifBody, { color: colors.mutedForeground }]}>{item.body}</Text>}
              </View>
            </View>
          )}
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
    card: {
      flexDirection: "row", alignItems: "flex-start", gap: 12,
      padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8,
    },
    icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    notifTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
    empty: { alignItems: "center", paddingTop: 80, gap: 8 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  });
