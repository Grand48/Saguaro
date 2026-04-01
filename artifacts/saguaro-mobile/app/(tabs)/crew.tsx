import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useListCrew } from "@workspace/api-client-react";

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const colors = useColors();
  const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.primary + "22",
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ fontSize: size * 0.35, fontFamily: "Inter_600SemiBold", color: colors.primary }}>
        {initials}
      </Text>
    </View>
  );
}

const ROLE_COLORS: Record<string, string> = {
  foreman: "#7c3aed",
  electrician: "#2563eb",
  plumber: "#0891b2",
  carpenter: "#d97706",
  laborer: "#6b7280",
  supervisor: "#16a34a",
};

export default function CrewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: crew, isLoading, refetch } = useListCrew({
    query: { refetchInterval: 60000 }
  });

  const s = makeStyles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[s.title, { color: colors.foreground }]}>Crew</Text>
        <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
          {crew?.length ?? 0} member{(crew?.length ?? 0) !== 1 ? "s" : ""}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={crew ?? []}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 90 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          scrollEnabled={(crew?.length ?? 0) > 0}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No crew members</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const roleColor = ROLE_COLORS[item.role?.toLowerCase()] ?? colors.mutedForeground;
            return (
              <TouchableOpacity
                style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}
                onPress={() => router.push(`/crew-member/${item.id}` as any)}
                activeOpacity={0.7}
              >
                <Avatar name={item.name} size={52} />
                <Text style={[s.name, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                <View style={[s.roleBadge, { backgroundColor: roleColor + "18" }]}>
                  <Text style={[s.roleText, { color: roleColor }]}>{item.role?.toUpperCase()}</Text>
                </View>
                <View style={s.contactRow}>
                  {item.phone && (
                    <View style={[s.contactIcon, { backgroundColor: colors.muted }]}>
                      <Ionicons name="call-outline" size={14} color={colors.primary} />
                    </View>
                  )}
                  {item.email && (
                    <View style={[s.contactIcon, { backgroundColor: colors.muted }]}>
                      <Ionicons name="mail-outline" size={14} color={colors.primary} />
                    </View>
                  )}
                </View>
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
    header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
    title: { fontSize: 26, fontFamily: "Inter_700Bold" },
    subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
    card: {
      borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10,
      alignItems: "center", gap: 8,
    },
    name: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    roleText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
    contactRow: { flexDirection: "row", gap: 6 },
    contactIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    empty: { alignItems: "center", paddingTop: 80, gap: 8 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  });
