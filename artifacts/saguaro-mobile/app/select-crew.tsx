import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useListCrew } from "@workspace/api-client-react";

const ROLE_COLORS: Record<string, string> = {
  foreman: "#7c3aed",
  electrician: "#2563eb",
  plumber: "#0891b2",
  carpenter: "#d97706",
  laborer: "#6b7280",
  supervisor: "#16a34a",
};

export default function SelectCrewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: crew, isLoading } = useListCrew({ query: {} });

  useEffect(() => {
    AsyncStorage.getItem("cc_crew_id").then((v) => {
      if (v) setSelectedId(parseInt(v));
    });
  }, []);

  const select = async (id: number, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem("cc_crew_id", String(id));
    await AsyncStorage.setItem("cc_crew_name", name);
    setSelectedId(id);
    setTimeout(() => router.back(), 300);
  };

  const s = makeStyles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Who are you?</Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground }]}>Select your name to personalize the app</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={crew ?? []}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 20 }}
          renderItem={({ item }: { item: any }) => {
            const isSelected = selectedId === item.id;
            const roleColor = ROLE_COLORS[item.role?.toLowerCase()] ?? colors.mutedForeground;
            const initials = item.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";

            return (
              <TouchableOpacity
                style={[
                  s.card,
                  {
                    backgroundColor: isSelected ? colors.primary + "12" : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => select(item.id, item.name)}
                activeOpacity={0.7}
              >
                <View style={[s.avatar, { backgroundColor: roleColor + "20" }]}>
                  <Text style={[s.initials, { color: roleColor }]}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.name, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[s.role, { color: roleColor }]}>{item.role}</Text>
                </View>
                {isSelected && (
                  <View style={[s.checkCircle, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
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
    header: {
      flexDirection: "row", alignItems: "flex-start", gap: 8,
      paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
    },
    backBtn: { paddingTop: 2, width: 32 },
    headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
    card: {
      flexDirection: "row", alignItems: "center", gap: 14,
      padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 10,
    },
    avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    initials: { fontSize: 16, fontFamily: "Inter_700Bold" },
    name: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
    role: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
    checkCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  });
