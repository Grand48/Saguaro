import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Linking, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useListLocations } from "@workspace/api-client-react";

export default function LocationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: locations, isLoading } = useListLocations({ query: {} });
  const s = makeStyles(colors);

  const openMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    Linking.openURL(`https://maps.google.com/?q=${encoded}`);
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Job Sites</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={locations ?? []}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 20 }}
          scrollEnabled={(locations?.length ?? 0) > 0}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="location-outline" size={48} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No locations</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => item.address && openMaps(item.address)}
              activeOpacity={0.7}
            >
              <View style={[s.icon, { backgroundColor: colors.accent }]}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.locationName, { color: colors.foreground }]}>{item.name}</Text>
                {item.address && (
                  <Text style={[s.locationAddr, { color: colors.mutedForeground }]}>{item.address}</Text>
                )}
              </View>
              {item.address && (
                <Ionicons name="navigate-outline" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
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
      flexDirection: "row", alignItems: "center", gap: 12,
      padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8,
    },
    icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    locationName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    locationAddr: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
    empty: { alignItems: "center", paddingTop: 80, gap: 8 },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  });
