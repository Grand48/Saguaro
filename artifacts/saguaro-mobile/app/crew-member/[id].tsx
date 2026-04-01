import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGetCrewMember } from "@workspace/api-client-react";

const ROLE_COLORS: Record<string, string> = {
  foreman: "#7c3aed",
  electrician: "#2563eb",
  plumber: "#0891b2",
  carpenter: "#d97706",
  laborer: "#6b7280",
  supervisor: "#16a34a",
};

export default function CrewMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const crewId = parseInt(id ?? "0");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: member, isLoading } = useGetCrewMember(crewId, { query: { enabled: !!crewId } });
  const s = makeStyles(colors);

  if (isLoading) {
    return <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }
  if (!member) {
    return <View style={[s.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.mutedForeground }}>Not found</Text></View>;
  }

  const roleColor = ROLE_COLORS[(member as any).role?.toLowerCase()] ?? colors.mutedForeground;
  const initials = (member as any).name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Crew Member</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 40 }}>
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[s.avatar, { backgroundColor: roleColor + "20" }]}>
            <Text style={[s.avatarText, { color: roleColor }]}>{initials}</Text>
          </View>
          <Text style={[s.name, { color: colors.foreground }]}>{(member as any).name}</Text>
          <View style={[s.roleBadge, { backgroundColor: roleColor + "20" }]}>
            <Text style={[s.roleText, { color: roleColor }]}>{(member as any).role?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          {/* Contact card */}
          {((member as any).phone || (member as any).email) && (
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.cardTitle, { color: colors.foreground }]}>Contact</Text>
              {(member as any).phone && (
                <TouchableOpacity
                  style={s.contactRow}
                  onPress={() => Linking.openURL(`tel:${(member as any).phone}`)}
                >
                  <View style={[s.contactIcon, { backgroundColor: colors.accent }]}>
                    <Ionicons name="call-outline" size={16} color={colors.primary} />
                  </View>
                  <Text style={[s.contactText, { color: colors.primary }]}>{(member as any).phone}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
              {(member as any).email && (
                <TouchableOpacity
                  style={s.contactRow}
                  onPress={() => Linking.openURL(`mailto:${(member as any).email}`)}
                >
                  <View style={[s.contactIcon, { backgroundColor: colors.accent }]}>
                    <Ionicons name="mail-outline" size={16} color={colors.primary} />
                  </View>
                  <Text style={[s.contactText, { color: colors.primary }]}>{(member as any).email}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Emergency contact */}
          {(member as any).emergencyContact && (
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.cardTitle, { color: colors.foreground }]}>Emergency Contact</Text>
              <Text style={[s.ecText, { color: colors.mutedForeground }]}>{(member as any).emergencyContact}</Text>
            </View>
          )}

          {/* Notes */}
          {(member as any).notes && (
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.cardTitle, { color: colors.foreground }]}>Notes</Text>
              <Text style={[s.ecText, { color: colors.mutedForeground }]}>{(member as any).notes}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
    },
    backBtn: { width: 32 },
    headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
    hero: { alignItems: "center", padding: 32, gap: 12, borderBottomWidth: 1 },
    avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
    avatarText: { fontSize: 28, fontFamily: "Inter_700Bold" },
    name: { fontSize: 22, fontFamily: "Inter_700Bold" },
    roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    roleText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
    card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
    cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
    contactRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
    contactIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    contactText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
    ecText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  });
